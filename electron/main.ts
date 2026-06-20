import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, exec, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    const child = spawn('npm', ['install', '-g', 'openclaude'], {
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
// OpenClaude chat session (long-lived process)
// -------------------------------------------------------------

interface SessionOptions {
  model: string;
  apiKey?: string;
  baseUrl?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

const sessions = new Map<string, ChildProcess>();

function startSession(sessionId: string, options: SessionOptions) {
  if (sessions.has(sessionId)) {
    return { ok: false, error: 'Session already exists' };
  }

  const args: string[] = [];
  if (ocStatus.path === 'npx openclaude') {
    args.push('--no-install', 'openclaude');
  }
  args.push('chat', '--stream', '--json');
  if (options.model) args.push('--model', options.model);
  if (options.apiKey) args.push('--api-key', options.apiKey);
  if (options.baseUrl) args.push('--base-url', options.baseUrl);
  if (options.systemPrompt) args.push('--system', options.systemPrompt);
  if (options.temperature !== undefined)
    args.push('--temperature', String(options.temperature));
  if (options.maxTokens !== undefined)
    args.push('--max-tokens', String(options.maxTokens));

  const cmd = ocStatus.path === 'npx openclaude' ? 'npx' : ocStatus.path || 'openclaude';
  const child = spawn(cmd, args, {
    env: { ...process.env, OPENCLAUDE_NON_INTERACTIVE: '1' },
    shell: process.platform === 'win32',
  });

  sessions.set(sessionId, child);

  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

  child.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    // Try to parse NDJSON stream events
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line);
        win?.webContents.send('openclaude:stream', { sessionId, event: evt });
      } catch {
        // Fallback: raw text
        win?.webContents.send('openclaude:stream', {
          sessionId,
          event: { type: 'text', text: line },
        });
      }
    }
  });

  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString();
    win?.webContents.send('openclaude:stderr', { sessionId, text });
  });

  child.on('close', (code) => {
    sessions.delete(sessionId);
    win?.webContents.send('openclaude:close', { sessionId, code });
  });

  child.on('error', (err) => {
    win?.webContents.send('openclaude:error', {
      sessionId,
      error: err.message,
    });
  });

  return { ok: true };
}

function sendToSession(sessionId: string, text: string) {
  const child = sessions.get(sessionId);
  if (!child || !child.stdin) return { ok: false, error: 'No active session' };
  child.stdin.write(text + '\n');
  return { ok: true };
}

function stopSession(sessionId: string) {
  const child = sessions.get(sessionId);
  if (!child) return;
  try {
    child.stdin?.end();
    child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  sessions.delete(sessionId);
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
      preload: path.join(__dirname, 'preload.js'),
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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

  ipcMain.handle('session:start', (_e, sessionId: string, options: SessionOptions) =>
    startSession(sessionId, options),
  );
  ipcMain.handle('session:send', (_e, sessionId: string, text: string) =>
    sendToSession(sessionId, text),
  );
  ipcMain.handle('session:stop', (_e, sessionId: string) => {
    stopSession(sessionId);
    return { ok: true };
  });

  ipcMain.handle('settings:load', () => loadSettings());
  ipcMain.handle('settings:save', (_e, s) => {
    saveSettings(s);
    return { ok: true };
  });

  ipcMain.handle('dialog:openFile', async () => {
    if (!mainWindow) return null;
    const r = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
    });
    return r.canceled ? null : r.filePaths[0];
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
  for (const id of sessions.keys()) stopSession(id);
});
