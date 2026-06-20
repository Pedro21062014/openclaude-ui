import { create } from 'zustand';
import type { AppSettings, ChatMessage, OpenClaudeStatus } from '@/types';
import { PROVIDERS } from '@/data/models';

const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: 'claude-sonnet-4-5',
  apiKey: '',
  baseUrl: '',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 8192,
  streamOutput: true,
  theme: 'dark',
  fontFamily: 'sans',
  fontSize: 'md',
  sidebarCollapsed: false,
  customArgs: '',
  telemetry: false,
};

interface AppState {
  // Status
  ocStatus: OpenClaudeStatus;
  setOcStatus: (s: OpenClaudeStatus | ((prev: OpenClaudeStatus) => OpenClaudeStatus)) => void;

  // Settings
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;
  initSettings: (s: Partial<AppSettings>) => void;

  // Conversations
  conversations: ChatMessage[][]; // simplified — single conversation for now
  currentMessages: ChatMessage[];
  addMessage: (m: ChatMessage) => void;
  updateMessage: (
    id: string,
    patch: Partial<ChatMessage> | ((prev: ChatMessage) => Partial<ChatMessage>),
  ) => void;
  clearMessages: () => void;

  // UI
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  isThinking: boolean;
  setIsThinking: (b: boolean) => void;
  showSettings: boolean;
  setShowSettings: (b: boolean) => void;
  showInstallScreen: boolean;
  setShowInstallScreen: (b: boolean) => void;
  // User explicitly clicked "Pular" (Skip) on the install screen.
  // Once true, App.tsx will NOT auto-show the install screen again even if
  // openclaude is not installed. Reset to false only on app restart.
  userSkippedInstall: boolean;
  setUserSkippedInstall: (b: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  ocStatus: {
    installed: false,
    path: null,
    version: null,
    installing: false,
    detecting: true, // start in detecting state so UI shows "Checking..."
    installProgress: 0,
    installLog: '',
    error: null,
  },
  setOcStatus: (s) =>
    set((state) => ({
      ocStatus:
        typeof s === 'function' ? s(state.ocStatus) : s,
    })),

  settings: DEFAULT_SETTINGS,
  setSettings: (s) =>
    set((state) => {
      const next = { ...state.settings, ...s };
      // Persist to disk
      window.openclaude?.saveSettings(next).catch(() => {});
      return { settings: next };
    }),
  initSettings: (s) =>
    set((state) => ({ settings: { ...DEFAULT_SETTINGS, ...s } })),

  conversations: [],
  currentMessages: [],
  addMessage: (m) =>
    set((state) => ({ currentMessages: [...state.currentMessages, m] })),
  updateMessage: (
    id: string,
    patch: Partial<ChatMessage> | ((prev: ChatMessage) => Partial<ChatMessage>),
  ) =>
    set((state) => ({
      currentMessages: state.currentMessages.map((m) => {
        if (m.id !== id) return m;
        const p = typeof patch === 'function' ? patch(m) : patch;
        return { ...m, ...p };
      }),
    })),
  clearMessages: () => set({ currentMessages: [] }),

  selectedModel: PROVIDERS[0].models[0].id,
  setSelectedModel: (m) => set({ selectedModel: m }),
  isThinking: false,
  setIsThinking: (b) => set({ isThinking: b }),
  showSettings: false,
  setShowSettings: (b) => set({ showSettings: b }),
  showInstallScreen: false,
  setShowInstallScreen: (b) => set({ showInstallScreen: b }),
  userSkippedInstall: false,
  setUserSkippedInstall: (b) => set({ userSkippedInstall: b }),
}));
