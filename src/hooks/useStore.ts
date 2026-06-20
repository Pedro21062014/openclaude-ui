import { create } from 'zustand';
import type { AppSettings, ChatMessage, OpenClaudeStatus, Conversation } from '@/types';
import { PROVIDERS } from '@/data/models';

const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: 'sonnet', // openclaude alias for latest Claude Sonnet
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

// -------------------------------------------------------------
// Conversation history persistence (localStorage)
// -------------------------------------------------------------
const CONV_STORAGE_KEY = 'openclaude-ui-conversations';

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONV_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  try {
    // Cap at 50 conversations to avoid bloating localStorage
    const capped = convs.slice(0, 50);
    localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(capped));
  } catch {
    // localStorage might be full — fail silently
  }
}

interface AppState {
  // Status
  ocStatus: OpenClaudeStatus;
  setOcStatus: (s: OpenClaudeStatus | ((prev: OpenClaudeStatus) => OpenClaudeStatus)) => void;

  // Settings
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;
  initSettings: (s: Partial<AppSettings>) => void;

  // Conversations
  // conversations: past conversations (persisted to localStorage)
  // currentMessages: messages in the active conversation
  // currentConversationId: ID of the active conversation (null = new chat)
  conversations: Conversation[];
  currentMessages: ChatMessage[];
  currentConversationId: string | null;
  addMessage: (m: ChatMessage) => void;
  updateMessage: (
    id: string,
    patch: Partial<ChatMessage> | ((prev: ChatMessage) => Partial<ChatMessage>),
  ) => void;
  clearMessages: () => void;
  setMessages: (msgs: ChatMessage[]) => void;
  // Start a new conversation (saves current one to history if non-empty)
  startNewConversation: () => void;
  // Load a past conversation by ID
  loadConversation: (id: string) => void;
  // Delete a conversation from history
  deleteConversation: (id: string) => void;
  // Persist the current conversation to history (called after each assistant response)
  persistCurrentConversation: () => void;

  // UI
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  isThinking: boolean;
  setIsThinking: (b: boolean) => void;
  showSettings: boolean;
  setShowSettings: (b: boolean) => void;
  showInstallScreen: boolean;
  setShowInstallScreen: (b: boolean) => void;
  userSkippedInstall: boolean;
  setUserSkippedInstall: (b: boolean) => void;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useStore = create<AppState>((set, get) => ({
  ocStatus: {
    installed: false,
    path: null,
    version: null,
    installing: false,
    detecting: true,
    installProgress: 0,
    installLog: '',
    error: null,
  },
  setOcStatus: (s) =>
    set((state) => ({
      ocStatus: typeof s === 'function' ? s(state.ocStatus) : s,
    })),

  settings: DEFAULT_SETTINGS,
  setSettings: (s) =>
    set((state) => {
      const next = { ...state.settings, ...s };
      window.openclaude?.saveSettings(next).catch(() => {});
      return { settings: next };
    }),
  initSettings: (s) =>
    set((state) => ({ settings: { ...DEFAULT_SETTINGS, ...s } })),

  // ----- Conversations -----
  conversations: loadConversations(),
  currentMessages: [],
  currentConversationId: null,

  addMessage: (m) =>
    set((state) => ({ currentMessages: [...state.currentMessages, m] })),

  updateMessage: (id, patch) =>
    set((state) => ({
      currentMessages: state.currentMessages.map((m) => {
        if (m.id !== id) return m;
        const p = typeof patch === 'function' ? patch(m) : patch;
        return { ...m, ...p };
      }),
    })),

  clearMessages: () => set({ currentMessages: [], currentConversationId: null }),

  setMessages: (msgs) => set({ currentMessages: msgs }),

  startNewConversation: () => {
    const state = get();
    // Save current conversation to history if it has messages
    if (state.currentMessages.length > 0) {
      const existingIdx = state.conversations.findIndex(
        (c) => c.id === state.currentConversationId,
      );
      const title =
        state.currentMessages.find((m) => m.role === 'user')?.content.slice(0, 60) ||
        'Nova conversa';
      const conv: Conversation = {
        id: state.currentConversationId || uid(),
        title,
        messages: state.currentMessages,
        model: state.selectedModel,
        createdAt: existingIdx >= 0
          ? state.conversations[existingIdx].createdAt
          : Date.now(),
        updatedAt: Date.now(),
      };
      const nextConvs = existingIdx >= 0
        ? state.conversations.map((c) => (c.id === conv.id ? conv : c))
        : [conv, ...state.conversations];
      saveConversations(nextConvs);
      set({ conversations: nextConvs });
    }
    set({ currentMessages: [], currentConversationId: null });
  },

  loadConversation: (id: string) => {
    const state = get();
    const conv = state.conversations.find((c) => c.id === id);
    if (!conv) return;
    set({
      currentMessages: conv.messages,
      currentConversationId: conv.id,
      selectedModel: conv.model || state.selectedModel,
    });
  },

  deleteConversation: (id: string) => {
    const state = get();
    const nextConvs = state.conversations.filter((c) => c.id !== id);
    saveConversations(nextConvs);
    set({
      conversations: nextConvs,
      ...(state.currentConversationId === id
        ? { currentMessages: [], currentConversationId: null }
        : {}),
    });
  },

  persistCurrentConversation: () => {
    const state = get();
    if (state.currentMessages.length === 0) return;
    const existingIdx = state.conversations.findIndex(
      (c) => c.id === state.currentConversationId,
    );
    const title =
      state.currentMessages.find((m) => m.role === 'user')?.content.slice(0, 60) ||
      'Nova conversa';
    const convId = state.currentConversationId || uid();
    const conv: Conversation = {
      id: convId,
      title,
      messages: state.currentMessages,
      model: state.selectedModel,
      createdAt: existingIdx >= 0
        ? state.conversations[existingIdx].createdAt
        : Date.now(),
      updatedAt: Date.now(),
    };
    const nextConvs = existingIdx >= 0
      ? state.conversations.map((c) => (c.id === conv.id ? conv : c))
      : [conv, ...state.conversations];
    saveConversations(nextConvs);
    set({
      conversations: nextConvs,
      currentConversationId: convId,
    });
  },

  // ----- UI -----
  selectedModel: 'sonnet',
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
