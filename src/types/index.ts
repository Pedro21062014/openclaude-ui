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

export interface FileOperation {
  id: string;
  type: 'create' | 'edit' | 'delete' | 'read' | 'notebook';
  tool: string; // 'Write' | 'Edit' | 'NotebookEdit' | 'Bash' | etc.
  filePath: string;
  // For Edit operations, the old and new strings (for diff display)
  oldString?: string;
  newString?: string;
  // For Write operations, the full content
  content?: string;
  timestamp: number;
}

export interface BashCommand {
  id: string;
  command: string;
  // Output from the command (may stream in)
  output?: string;
  // 'running' | 'done' | 'error'
  status: 'running' | 'done' | 'error';
  // Exit code (when done)
  exitCode?: number;
  // Tool that ran this (usually 'Bash')
  tool?: string;
  timestamp: number;
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
  // File operations performed by the assistant in this message
  fileOperations?: FileOperation[];
  // Bash commands executed by the assistant in this message
  bashCommands?: BashCommand[];
  // Whether the message has finished streaming (controls when action
  // buttons and diff button are shown)
  done?: boolean;
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
