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
  installProgress: number; // 0..100
  installLog: string;
  error: string | null;
}

let ocStatus: OpenClaudeStatus = {
  installed: false,
  path: null,
  version: null,
  installing: false,
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

function detectOpenClaude(): Promise<{ path: string; version: string } | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const child = exec(`${cmd} openclaude`, { env: process.env });
    let out = '';
    child.stdout?.on('data', (d) => (out += d.toString()));
    child.stderr?.on('data', () => {});
    child.on('close', (code) => {
      if (code !== 0 || !out.trim()) {
        // Fallback: try `npx openclaude --version`
        const npx = exec('npx --no-install openclaude --version', { env: process.env });
        let vOut = '';
        npx.stdout?.on('data', (d) => (vOut += d.toString()));
        npx.stderr?.on('data', () => {});
        npx.on('close', (c) => {
          if (c === 0 && vOut.trim()) {
            resolve({ path: 'npx openclaude', version: vOut.trim() });
          } else {
            resolve(null);
          }
        });
        return;
      }
      const ocPath = out.trim().split(/\r?\n/)[0];
      // Get version
      const v = exec(`"${ocPath}" --version`, { env: process.env });
      let vOut = '';
      v.stdout?.on('data', (d) => (vOut += d.toString()));
      v.stderr?.on('data', () => {});
      v.on('close', () => {
        resolve({ path: ocPath, version: vOut.trim() || 'unknown' });
      });
    });
  });
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
  const detected = await detectOpenClaude();
  if (detected) {
    ocStatus.installed = true;
    ocStatus.path = detected.path;
    ocStatus.version = detected.version;
  } else {
    ocStatus.installed = false;
  }
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
