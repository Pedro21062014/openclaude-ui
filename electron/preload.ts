import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // OpenClaude lifecycle
  getOpenClaudeStatus: () => ipcRenderer.invoke('openclaude:status:get'),
  installOpenClaude: () => ipcRenderer.invoke('openclaude:install'),
  detectOpenClaude: () => ipcRenderer.invoke('openclaude:detect'),
  onOpenClaudeStatus: (cb: (status: any) => void) => {
    const handler = (_e: any, status: any) => cb(status);
    ipcRenderer.on('openclaude:status', handler);
    return () => ipcRenderer.removeListener('openclaude:status', handler);
  },

  // Chat sessions
  startSession: (sessionId: string, options: any) =>
    ipcRenderer.invoke('session:start', sessionId, options),
  sendToSession: (sessionId: string, text: string) =>
    ipcRenderer.invoke('session:send', sessionId, text),
  stopSession: (sessionId: string) => ipcRenderer.invoke('session:stop', sessionId),

  onStream: (cb: (data: any) => void) => {
    const handler = (_e: any, data: any) => cb(data);
    ipcRenderer.on('openclaude:stream', handler);
    return () => ipcRenderer.removeListener('openclaude:stream', handler);
  },
  onStderr: (cb: (data: any) => void) => {
    const handler = (_e: any, data: any) => cb(data);
    ipcRenderer.on('openclaude:stderr', handler);
    return () => ipcRenderer.removeListener('openclaude:stderr', handler);
  },
  onClose: (cb: (data: any) => void) => {
    const handler = (_e: any, data: any) => cb(data);
    ipcRenderer.on('openclaude:close', handler);
    return () => ipcRenderer.removeListener('openclaude:close', handler);
  },
  onError: (cb: (data: any) => void) => {
    const handler = (_e: any, data: any) => cb(data);
    ipcRenderer.on('openclaude:error', handler);
    return () => ipcRenderer.removeListener('openclaude:error', handler);
  },

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (s: any) => ipcRenderer.invoke('settings:save', s),

  // File dialog
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  // Platform info
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
  },
};

contextBridge.exposeInMainWorld('openclaude', api);

export type OpenClaudeAPI = typeof api;
