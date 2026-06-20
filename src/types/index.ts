export interface ModelProvider {
  id: string;
  name: string;
  logo: string;
  logoDark?: string;
  color: string;
  models: ModelOption[];
  defaultBaseUrl?: string;
  requiresApiKey: boolean;
  envVar?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  contextWindow?: number;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: number;
  thinking?: boolean;
  error?: boolean;
  tokens?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  // OpenClaude CLI settings
  defaultModel: string;
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  streamOutput: boolean;

  // UI settings
  theme: 'light' | 'dark' | 'system';
  fontFamily: 'sans' | 'serif' | 'mono';
  fontSize: 'sm' | 'md' | 'lg';
  sidebarCollapsed: boolean;

  // Advanced
  customArgs: string;
  telemetry: boolean;
}

export interface OpenClaudeStatus {
  installed: boolean;
  path: string | null;
  version: string | null;
  installing: boolean;
  detecting: boolean;
  installProgress: number;
  installLog: string;
  error: string | null;
}
