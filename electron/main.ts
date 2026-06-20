import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import { spawn, exec, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import https from 'node:https';

// Resolve the directory containing the bundled main.js / preload.js.
// In development: __dirname is set by Vite to the dist-electron folder.
// In production (packaged asar): __dirname may point inside app.asar,
// which is the correct location for both main.js and preload.js.
// The fallback to process.cwd() only kicks in for very old Electron
// versions or unusual bundlers — and we never want to use the user's
// home directory (which is what cwd returns when launched from a desktop
// launcher). So we prefer __dirname unconditionally when available.
declare const __dirname: string;
const MAIN_DIR: string =
  typeof __dirname !== 'undefined' && __dirname
    ? __dirname
    : (app ? path.dirname(app.getAppPath()) : process.cwd());

// -------------------------------------------------------------
// OpenClaude path resolution & installation
// -------------------------------------------------------------

interface OpenClaudeStatus {
  installed: boolean;
  path: string | null;
  version: string | null;
  installing: boolean;
  detecting: boolean;
  installProgress: number; // 0..100
  installLog: string;
  error: string | null;
}

let ocStatus: OpenClaudeStatus = {
  installed: false,
  path: null,
  version: null,
  installing: false,
  detecting: false,
  installProgress: 0,
  installLog: '',
  error: null,
};

function pushStatus() {
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send('openclaude:status', { ...ocStatus });
  }
}

function appendLog(line: string) {
  const stamp = new Date().toISOString().split('T')[1].replace('Z', '');
  ocStatus.installLog += `[${stamp}] ${line}\n`;
  pushStatus();
}

// -------------------------------------------------------------
// Fast helpers — all with hard timeouts so the UI never hangs
// -------------------------------------------------------------

/** Run a command with a hard timeout. Rejects if it exceeds `ms`. */
function execWithTimeout(cmd: string, ms: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, {
      env: process.env,
      windowsHide: true,
      timeout: ms,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      reject(new Error(`Command timed out after ${ms}ms: ${cmd}`));
    }, ms);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Check if a file exists and is executable. */
function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Build a list of likely `openclaude` install paths to probe directly.
 * This is dramatically faster than spawning `which`/`where` (which has
 * to scan PATH), and avoids the slow npx fallback entirely.
 */
function getCandidatePaths(): string[] {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const home = os.homedir();
  const paths: string[] = [];

  const ext = isWin ? '.cmd' : '';

  // npm global prefix (most common install location)
  // %APPDATA%\npm on Windows, /usr/local/bin or /opt/homebrew/bin on mac, /usr/local/bin on linux
  if (isWin) {
    paths.push(path.join(home, 'AppData', 'Roaming', 'npm', `openclaude${ext}`));
    paths.push(path.join(home, 'AppData', 'Roaming', 'npm', 'openclaude'));
    paths.push(path.join(home, 'AppData', 'Roaming', 'npm', 'node_modules', 'openclaude', 'bin', 'openclaude'));
  } else {
    paths.push('/usr/local/bin/openclaude');
    paths.push('/usr/bin/openclaude');
    paths.push('/opt/homebrew/bin/openclaude');
    paths.push(path.join(home, '.local', 'bin', 'openclaude'));
    paths.push(path.join(home, '.npm-global', 'bin', 'openclaude'));
    // nvm shims (bash/zsh)
    paths.push(path.join(home, '.nvm', 'versions', 'node', 'current', 'bin', 'openclaude'));
    // volta
    paths.push(path.join(home, '.volta', 'bin', 'openclaude'));
    // pnpm
    paths.push(path.join(home, '.local', 'share', 'pnpm', 'openclaude'));
    // yarn global
    paths.push(path.join(home, '.yarn', 'bin', 'openclaude'));
    paths.push(path.join(home, '.config', 'yarn', 'global', 'node_modules', '.bin', 'openclaude'));
  }

  return paths;
}

/**
 * Real detection — actually RUN the `openclaude` command to verify it works.
 *
 * Strategy (in order, stops at first hit):
 *   1. Try `openclaude --version` directly (uses PATH, fast on most systems).
 *      This is the ONLY reliable check — file existence doesn't guarantee the
 *      binary actually runs (could be broken, wrong arch, missing deps, etc).
 *   2. Probe known install paths and run each one with --version.
 *   3. Quick `which`/`where` with a 1.5s timeout, then run the result.
 *   4. Bail out → returns null → caller can decide to install.
 *
 * Every subprocess has a hard 1.5s timeout so the UI never hangs.
 *
 * Returns the path + version, or null if openclaude is NOT working.
 */
async function detectOpenClaude(): Promise<{ path: string; version: string } | null> {
  // ---- Step 1: try `openclaude --version` directly (PATH-based) ----
  // This is the most reliable check — if the command runs and exits 0 with
  // non-empty output, openclaude is actually working.
  try {
    const r = await execWithTimeout('openclaude --version', 2000);
    if (r.code === 0 && r.stdout.trim()) {
      // Try to find the actual path for display purposes
      let ocPath = 'openclaude';
      try {
        const w = await execWithTimeout(
          process.platform === 'win32' ? 'where openclaude' : 'which openclaude',
          1000,
        );
        if (w.code === 0 && w.stdout.trim()) {
          ocPath = w.stdout.trim().split(/\r?\n/)[0];
        }
      } catch {}
      return { path: ocPath, version: r.stdout.trim() };
    }
  } catch {
    // openclaude not on PATH or timed out — try known install paths next
  }

  // ---- Step 2: probe candidate paths and RUN each one ----
  const candidates = getCandidatePaths();
  for (const p of candidates) {
    if (!fileExists(p)) continue;
    // Run --version to verify the binary actually works
    try {
      const r = await execWithTimeout(`"${p}" --version`, 2000);
      if (r.code === 0 && r.stdout.trim()) {
        return { path: p, version: r.stdout.trim() };
      }
      // If --version fails, try --help (some CLIs don't have --version)
      const h = await execWithTimeout(`"${p}" --help`, 2000);
      if (h.code === 0 && (h.stdout.trim() || h.stderr.trim())) {
        return { path: p, version: 'installed' };
      }
    } catch {
      // Binary exists but didn't run — keep probing other candidates
    }
  }

  // ---- Step 3: which/where with hard timeout, then run ----
  try {
    const cmd = process.platform === 'win32' ? 'where openclaude' : 'which openclaude';
    const r = await execWithTimeout(cmd, 1500);
    if (r.code === 0 && r.stdout.trim()) {
      const ocPath = r.stdout.trim().split(/\r?\n/)[0];
      // Verify it actually runs
      try {
        const v = await execWithTimeout(`"${ocPath}" --version`, 2000);
        if (v.code === 0 && v.stdout.trim()) {
          return { path: ocPath, version: v.stdout.trim() };
        }
      } catch {}
    }
  } catch {
    // which/where timed out or failed
  }

  // ---- Step 4: NOT found / not working ----
  return null;
}

async function installOpenClaude() {
  if (ocStatus.installing) return;
  ocStatus.installing = true;
  ocStatus.installProgress = 0;
  ocStatus.installLog = '';
  ocStatus.error = null;
  pushStatus();

  appendLog('Iniciando instalação do OpenClaude...');
  ocStatus.installProgress = 5;
  pushStatus();

  // Detect npm
  const hasNpm = await new Promise<boolean>((resolve) => {
    const c = exec('npm --version', { env: process.env });
    let ok = false;
    c.stdout?.on('data', () => (ok = true));
    c.on('close', () => resolve(ok));
  });

  if (!hasNpm) {
    ocStatus.error =
      'Node.js/npm não encontrado. Instale o Node.js (https://nodejs.org) e tente novamente.';
    ocStatus.installing = false;
    pushStatus();
    return;
  }

  appendLog('npm detectado. Instalando openclaude globalmente...');
  ocStatus.installProgress = 15;
  pushStatus();

  await new Promise<void>((resolve) => {
    const child = spawn('npm', ['install', '-g', '@gitlawb/openclaude@latest'], {
      env: process.env,
      shell: process.platform === 'win32',
    });
    child.stdout?.on('data', (d) => {
      const s = d.toString();
      appendLog(s.trim());
      if (ocStatus.installProgress < 75) ocStatus.installProgress += 2;
      pushStatus();
    });
    child.stderr?.on('data', (d) => {
      appendLog(`[stderr] ${d.toString().trim()}`);
      pushStatus();
    });
    child.on('close', (code) => {
      ocStatus.installProgress = 90;
      pushStatus();
      if (code !== 0) {
        ocStatus.error = `Falha na instalação (npm exit ${code}). Veja o log acima.`;
      }
      resolve();
    });
  });

  if (ocStatus.error) {
    ocStatus.installing = false;
    pushStatus();
    return;
  }

  appendLog('Verificando instalação...');
  ocStatus.installProgress = 95;
  pushStatus();

  const detected = await detectOpenClaude();
  if (detected) {
    ocStatus.installed = true;
    ocStatus.path = detected.path;
    ocStatus.version = detected.version;
    ocStatus.installProgress = 100;
    appendLog(`OpenClaude instalado com sucesso: ${detected.version}`);
  } else {
    ocStatus.error = 'Instalação concluída mas openclaude não foi encontrado no PATH. Reinicie o app.';
  }
  ocStatus.installing = false;
  pushStatus();
}

async function ensureOpenClaude() {
  // Mark as detecting so UI can show "Checking..." immediately
  ocStatus.detecting = true;
  ocStatus.installed = false;
  ocStatus.error = null;
  pushStatus();

  const detected = await detectOpenClaude();
  if (detected) {
    ocStatus.installed = true;
    ocStatus.path = detected.path;
    ocStatus.version = detected.version;
  } else {
    ocStatus.installed = false;
    ocStatus.path = null;
    ocStatus.version = null;
  }
  ocStatus.detecting = false;
  pushStatus();
}

// -------------------------------------------------------------
// OpenClaude prompt execution (1 process per message)
// -------------------------------------------------------------

interface PromptOptions {
  model: string;
  apiKey?: string;
  baseUrl?: string;
  provider?: string; // 'anthropic' | 'openai' | 'gemini' | 'github' | 'bedrock' | 'vertex' | 'ollama'
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  customArgs?: string;
  // Optional: continue previous conversation (use --continue flag)
  continueConversation?: boolean;
  // Optional: image attachments (file paths)
  imagePaths?: string[];
}

// Track running processes by sessionId so we can stop them.
const runningProcesses = new Map<string, ChildProcess>();
// Track whether we've already started a conversation in this app session
// (so subsequent messages can use --continue to maintain context).
let hasPriorConversation = false;

/**
 * Build the env vars OpenClaude actually reads.
 * (See previous commit for full explanation — credentials come from env
 * vars, not CLI flags, because openclaude doesn't accept --api-key etc.)
 */
function buildSessionEnv(options: PromptOptions): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };

  const provider = (options.provider || 'openai').toLowerCase();
  const apiKey = options.apiKey || '';
  const baseUrl = options.baseUrl || '';

  if (provider === 'openai' || provider === 'openrouter' || provider === 'deepseek' || provider === 'zai' || provider === 'qwen' || provider === 'mistral' || provider === 'groq' || provider === 'together' || provider === 'fireworks' || provider === 'perplexity' || provider === 'xai' || provider === 'openai-compatible') {
    env.CLAUDE_CODE_USE_OPENAI = '1';
    if (apiKey) env.OPENAI_API_KEY = apiKey;
    if (baseUrl) env.OPENAI_BASE_URL = baseUrl;
    if (options.model) env.OPENAI_MODEL = options.model;
  } else if (provider === 'anthropic' || provider === 'claude') {
    if (apiKey) env.ANTHROPIC_API_KEY = apiKey;
    if (baseUrl) env.ANTHROPIC_BASE_URL = baseUrl;
  } else if (provider === 'gemini' || provider === 'google') {
    if (apiKey) env.GEMINI_API_KEY = apiKey;
    if (baseUrl) env.GOOGLE_GENERATIVE_AI_BASE_URL = baseUrl;
  } else if (provider === 'ollama') {
    env.CLAUDE_CODE_USE_OPENAI = '1';
    env.OPENAI_BASE_URL = baseUrl || 'http://localhost:11434/v1';
    if (options.model) env.OPENAI_MODEL = options.model;
  } else if (provider === 'github') {
    env.CLAUDE_CODE_USE_GITHUB = '1';
    if (apiKey) env.GITHUB_TOKEN = apiKey;
    if (options.model) env.OPENAI_MODEL = options.model;
  } else {
    env.CLAUDE_CODE_USE_OPENAI = '1';
    if (apiKey) env.OPENAI_API_KEY = apiKey;
    if (baseUrl) env.OPENAI_BASE_URL = baseUrl;
    if (options.model) env.OPENAI_MODEL = options.model;
  }

  env.OPENCLAUDE_NON_INTERACTIVE = '1';
  return env;
}

/**
 * Run a single OpenClaude prompt.
 *
 * Each call spawns a NEW openclaude process with the prompt as a CLI arg.
 * Output is streamed as NDJSON events on stdout, forwarded to the renderer
 * via 'openclaude:stream' IPC events.
 *
 * For conversation continuity, the second and subsequent calls pass
 * --continue so openclaude resumes the most recent conversation in the
 * working directory.
 *
 * Real CLI interface (verified on @gitlawb/openclaude v0.19.0):
 *   openclaude -p \
 *     --output-format stream-json \
 *     --verbose \
 *     --include-partial-messages \
 *     --permission-mode bypassPermissions \
 *     [--continue] \
 *     --model <model> \
 *     --provider <provider> \
 *     --system-prompt <prompt> \
 *     <user prompt>
 */
function runPrompt(sessionId: string, prompt: string, options: PromptOptions) {
  // If there's already a process running for this sessionId, kill it.
  const existing = runningProcesses.get(sessionId);
  if (existing) {
    try {
      existing.stdin?.end();
      existing.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    runningProcesses.delete(sessionId);
  }

  const args: string[] = [];

  // --print mode (non-interactive)
  args.push('-p');
  // Stream JSON output (NDJSON events on stdout)
  args.push('--output-format', 'stream-json');
  // stream-json output REQUIRES --verbose (openclaude errors out otherwise)
  args.push('--verbose');
  // Emit partial message chunks as they arrive (for live token streaming)
  args.push('--include-partial-messages');
  // Skip y/n permission prompts since we're non-interactive
  args.push('--permission-mode', 'bypassPermissions');

  // Continue previous conversation if requested
  // (openclaude's --continue resumes the most recent conversation in cwd)
  if (options.continueConversation || hasPriorConversation) {
    args.push('--continue');
  }

  // Model
  if (options.model) {
    args.push('--model', options.model);
  }

  // Provider
  if (options.provider) {
    const p = options.provider.toLowerCase();
    const providerMap: Record<string, string> = {
      claude: 'anthropic',
      anthropic: 'anthropic',
      openai: 'openai',
      gemini: 'gemini',
      google: 'gemini',
      ollama: 'ollama',
      github: 'github',
      openrouter: 'openai',
      deepseek: 'openai',
      zai: 'openai',
      qwen: 'openai',
      mistral: 'openai',
      groq: 'openai',
      together: 'openai',
      fireworks: 'openai',
      perplexity: 'openai',
      xai: 'openai',
    };
    const ocProvider = providerMap[p] || 'openai';
    args.push('--provider', ocProvider);
  }

  // System prompt (only pass on first message — openclaude remembers it
  // for continued conversations)
  if (options.systemPrompt && !options.continueConversation && !hasPriorConversation) {
    args.push('--system-prompt', options.systemPrompt);
  }

  // Custom CLI args from settings
  if (options.customArgs) {
    args.push(...options.customArgs.split(/\s+/).filter(Boolean));
  }

  // The prompt itself — pass as a positional argument.
  // IMPORTANT: do NOT use --input-format stream-json (that expects JSON
  // on stdin and was the cause of the "Unexpected token 'o'" error).
  // Just pass the text prompt directly as the last arg.
  args.push(prompt);

  // Determine the command to spawn.
  let cmd: string = ocStatus.path || 'openclaude';
  let finalArgs: string[] = args;
  if (cmd === 'npx openclaude') {
    cmd = 'npx';
    finalArgs = ['--no-install', 'openclaude', ...args];
  }

  const sessionEnv = buildSessionEnv(options);

  const child = spawn(cmd, finalArgs, {
    env: sessionEnv,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'], // stdin not needed
    cwd: os.homedir(), // continue conversations in home dir
  });

  runningProcesses.set(sessionId, child);
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

  // Buffer to handle partial JSON lines (NDJSON events may span chunks)
  let stdoutBuffer = '';
  child.stdout?.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    // Process complete lines
    let nlIdx: number;
    while ((nlIdx = stdoutBuffer.indexOf('\n')) >= 0) {
      const line = stdoutBuffer.slice(0, nlIdx).trim();
      stdoutBuffer = stdoutBuffer.slice(nlIdx + 1);
      if (!line) continue;
      try {
        const evt = JSON.parse(line);
        win?.webContents.send('openclaude:stream', { sessionId, event: evt });
      } catch {
        // Line is not valid JSON — send as raw text event
        win?.webContents.send('openclaude:stream', {
          sessionId,
          event: { type: 'text', text: line },
        });
      }
    }
  });

  // Same buffering for stderr
  let stderrBuffer = '';
  child.stderr?.on('data', (chunk) => {
    stderrBuffer += chunk.toString();
    let nlIdx: number;
    while ((nlIdx = stderrBuffer.indexOf('\n')) >= 0) {
      const line = stderrBuffer.slice(0, nlIdx).trim();
      stderrBuffer = stderrBuffer.slice(nlIdx + 1);
      if (line) {
        win?.webContents.send('openclaude:stderr', { sessionId, text: line });
      }
    }
  });

  child.on('close', (code) => {
    // Flush any remaining buffered content
    if (stdoutBuffer.trim()) {
      try {
        const evt = JSON.parse(stdoutBuffer.trim());
        win?.webContents.send('openclaude:stream', { sessionId, event: evt });
      } catch {
        win?.webContents.send('openclaude:stream', {
          sessionId,
          event: { type: 'text', text: stdoutBuffer.trim() },
        });
      }
    }
    runningProcesses.delete(sessionId);
    // Mark that we've had a conversation so subsequent messages use --continue
    if (code === 0) {
      hasPriorConversation = true;
    }
    win?.webContents.send('openclaude:close', { sessionId, code });
  });

  child.on('error', (err) => {
    runningProcesses.delete(sessionId);
    win?.webContents.send('openclaude:error', {
      sessionId,
      error: err.message,
    });
  });

  return { ok: true };
}

function stopPrompt(sessionId: string) {
  const child = runningProcesses.get(sessionId);
  if (!child) return;
  try {
    child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  runningProcesses.delete(sessionId);
}

// -------------------------------------------------------------
// Settings persistence
// -------------------------------------------------------------

const settingsFile = path.join(app.getPath('userData'), 'settings.json');

function loadSettings(): Record<string, any> {
  try {
    if (fs.existsSync(settingsFile)) {
      return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    }
  } catch {
    /* ignore */
  }
  return {};
}

function saveSettings(s: Record<string, any>) {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// -------------------------------------------------------------
// Window creation
// -------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1816',
    title: 'OpenClaude UI',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(MAIN_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: load the bundled index.html.
    // Try a list of candidate locations because different packagers
    // (electron-builder with asar vs unpacked, AppImage, portable, etc.)
    // place dist/ at different relative paths.
    const candidates = [
      path.join(MAIN_DIR, '../dist/index.html'), // most common: dist-electron/../dist
      path.join(MAIN_DIR, '../../dist/index.html'), // when main.js is nested deeper
      path.join(app.getAppPath(), 'dist/index.html'), // absolute app root
      path.join(app.getAppPath(), '../dist/index.html'), // sibling of app.asar
    ];
    let loaded = false;
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          mainWindow.loadFile(candidate);
          loaded = true;
          break;
        }
      } catch {
        // ignore — try next candidate
      }
    }
    if (!loaded) {
      // Last resort: log the error and show a blank page.
      // The user can open DevTools (Ctrl+Shift+I) to debug.
      console.error(
        '[OpenClaude UI] Could not find index.html in any of:',
        candidates,
      );
      mainWindow.loadURL(
        'data:text/html,<html><body style="font-family:sans-serif;padding:40px;color:#d97757;background:#1a1816">' +
          '<h1>Failed to load UI</h1>' +
          '<p>The app bundle is missing the <code>dist/index.html</code> file.</p>' +
          '<p>Looked in:</p><pre>' +
          candidates.join('\n') +
          '</pre>' +
          '<p>MAIN_DIR = ' + MAIN_DIR + '</p>' +
          '<p>app.getAppPath() = ' + app.getAppPath() + '</p>' +
          '</body></html>',
      );
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -------------------------------------------------------------
// App lifecycle
// -------------------------------------------------------------

app.whenReady().then(async () => {
  // IPC handlers
  ipcMain.handle('openclaude:status:get', () => ocStatus);
  ipcMain.handle('openclaude:install', () => {
    installOpenClaude();
    return { ok: true };
  });
  ipcMain.handle('openclaude:detect', async () => {
    await ensureOpenClaude();
    return ocStatus;
  });

  ipcMain.handle('session:start', () => {
    // No-op kept for backwards compat — sessions are now per-prompt.
    return { ok: true };
  });
  ipcMain.handle(
    'session:send',
    (_e, sessionId: string, text: string, options: PromptOptions) =>
      runPrompt(sessionId, text, options),
  );
  ipcMain.handle('session:stop', (_e, sessionId: string) => {
    stopPrompt(sessionId);
    return { ok: true };
  });
  // Also expose a clearer alias
  ipcMain.handle(
    'prompt:run',
    (_e, sessionId: string, prompt: string, options: PromptOptions) =>
      runPrompt(sessionId, prompt, options),
  );
  ipcMain.handle('prompt:stop', (_e, sessionId: string) => {
    stopPrompt(sessionId);
    return { ok: true };
  });

  ipcMain.handle('settings:load', () => loadSettings());
  ipcMain.handle('settings:save', (_e, s) => {
    saveSettings(s);
    return { ok: true };
  });

  ipcMain.handle('dialog:openFile', async (_e, opts?: { multiple?: boolean; images?: boolean }) => {
    if (!mainWindow) return null;
    const properties: ('openFile' | 'multiSelections')[] = ['openFile'];
    if (opts?.multiple) properties.push('multiSelections');
    const r = await dialog.showOpenDialog(mainWindow, {
      properties,
      filters: opts?.images
        ? [
            { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
            { name: 'Todos os arquivos', extensions: ['*'] },
          ]
        : [{ name: 'Todos os arquivos', extensions: ['*'] }],
    });
    if (r.canceled) return null;
    return opts?.multiple ? r.filePaths : r.filePaths[0];
  });

  // Read an image file and return as base64 data URL (for preview in UI).
  ipcMain.handle('file:readAsDataURL', async (_e, filePath: string) => {
    try {
      const buf = fs.readFileSync(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const mime =
        ext === 'png' ? 'image/png' :
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'gif' ? 'image/gif' :
        ext === 'webp' ? 'image/webp' :
        ext === 'bmp' ? 'image/bmp' :
        'application/octet-stream';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (e: any) {
      return null;
    }
  });

  createWindow();

  // Detect OpenClaude on launch (don't auto-install — let UI decide)
  ensureOpenClaude().catch(console.error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  for (const id of runningProcesses.keys()) stopPrompt(id);
});
