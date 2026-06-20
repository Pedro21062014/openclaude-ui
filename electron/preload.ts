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

  // Chat: each message runs a new openclaude process via runPrompt.
  // sendToSession now takes (sessionId, text, options) — options include
  // model/provider/apiKey/etc., and runPrompt spawns openclaude with
  // --continue for conversation continuity on subsequent messages.
  startSession: (_sessionId: string, _options: any) =>
    ipcRenderer.invoke('session:start'), // no-op kept for compat
  sendToSession: (sessionId: string, text: string, options: any) =>
    ipcRenderer.invoke('session:send', sessionId, text, options),
  stopSession: (sessionId: string) => ipcRenderer.invoke('session:stop', sessionId),

  // Aliases
  runPrompt: (sessionId: string, prompt: string, options: any) =>
    ipcRenderer.invoke('prompt:run', sessionId, prompt, options),
  stopPrompt: (sessionId: string) => ipcRenderer.invoke('prompt:stop', sessionId),

  // Stream events
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

  // File dialog — supports { multiple, images } options
  openFile: (opts?: { multiple?: boolean; images?: boolean }) =>
    ipcRenderer.invoke('dialog:openFile', opts),

  // Read a file as base64 data URL (used for image previews)
  readAsDataURL: (filePath: string) =>
    ipcRenderer.invoke('file:readAsDataURL', filePath),

  // Platform info
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
  },
};

contextBridge.exposeInMainWorld('openclaude', api);

export type OpenClaudeAPI = typeof api;
