import type { ModelProvider } from '@/types';

// All logos sourced from lobehub/lobe-icons (light variants, transparent PNG)
// https://github.com/lobehub/lobe-icons
const BASE = 'https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light';

export const PROVIDERS: ModelProvider[] = [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    logo: `${BASE}/claude-color.png`,
    color: '#d97757',
    requiresApiKey: true,
    envVar: 'ANTHROPIC_API_KEY',
    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', contextWindow: 200000, description: 'Most capable, flagship model' },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', contextWindow: 200000, description: 'Balanced performance and speed' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', contextWindow: 200000, description: 'Fast and lightweight' },
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', contextWindow: 200000, description: 'Previous generation Sonnet' },
      { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', contextWindow: 200000, description: 'Previous generation Haiku' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    logo: `${BASE}/openai.png`,
    color: '#10a37f',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-5', name: 'GPT-5', contextWindow: 200000, description: 'Latest flagship' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', contextWindow: 128000 },
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 128000 },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
      { id: 'o3', name: 'o3', contextWindow: 200000, description: 'Reasoning model' },
      { id: 'o4-mini', name: 'o4-mini', contextWindow: 128000 },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    logo: `${BASE}/gemini-color.png`,
    color: '#4285f4',
    requiresApiKey: true,
    envVar: 'GEMINI_API_KEY',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-3-pro', name: 'Gemini 3 Pro', contextWindow: 2000000, description: 'Latest Pro with massive context' },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash', contextWindow: 1000000 },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 2000000 },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1000000 },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1000000 },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    logo: `${BASE}/deepseek-color.png`,
    color: '#4d6bfe',
    requiresApiKey: true,
    envVar: 'DEEPSEEK_API_KEY',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', contextWindow: 128000, description: 'Latest flagship MoE' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', contextWindow: 128000, description: 'Reasoning model' },
      { id: 'deepseek-r1-distill', name: 'R1 Distill Qwen', contextWindow: 128000 },
    ],
  },
  {
    id: 'zai',
    name: 'Z.AI',
    logo: `${BASE}/zai.png`,
    color: '#1e6fff',
    requiresApiKey: true,
    envVar: 'ZAI_API_KEY',
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    models: [
      { id: 'glm-4.7', name: 'GLM-4.7', contextWindow: 128000, description: 'Latest GLM flagship' },
      { id: 'glm-4.6', name: 'GLM-4.6', contextWindow: 128000 },
      { id: 'glm-4.5', name: 'GLM-4.5', contextWindow: 128000 },
      { id: 'glm-4.5-air', name: 'GLM-4.5 Air', contextWindow: 128000 },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', contextWindow: 128000, description: 'Free tier' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    logo: `${BASE}/openrouter.png`,
    color: '#6366f1',
    requiresApiKey: true,
    envVar: 'OPENROUTER_API_KEY',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1 (via OR)', contextWindow: 200000 },
      { id: 'openai/gpt-5', name: 'GPT-5 (via OR)', contextWindow: 200000 },
      { id: 'google/gemini-3-pro', name: 'Gemini 3 Pro (via OR)', contextWindow: 2000000 },
      { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2 (via OR)', contextWindow: 128000 },
      { id: 'meta-llama/llama-4-405b', name: 'Llama 4 405B (via OR)', contextWindow: 128000 },
      { id: 'qwen/qwen3-235b', name: 'Qwen3 235B (via OR)', contextWindow: 128000 },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    logo: `${BASE}/ollama.png`,
    color: '#000000',
    requiresApiKey: false,
    defaultBaseUrl: 'http://localhost:11434',
    models: [
      { id: 'llama4:405b', name: 'Llama 4 405B', contextWindow: 128000 },
      { id: 'llama4:70b', name: 'Llama 4 70B', contextWindow: 128000 },
      { id: 'qwen3:235b', name: 'Qwen3 235B', contextWindow: 128000 },
      { id: 'qwen3:32b', name: 'Qwen3 32B', contextWindow: 128000 },
      { id: 'deepseek-r1:70b', name: 'DeepSeek R1 70B', contextWindow: 128000 },
      { id: 'mistral-large:123b', name: 'Mistral Large', contextWindow: 128000 },
      { id: 'gemma3:27b', name: 'Gemma 3 27B', contextWindow: 128000 },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    logo: `${BASE}/mistral.png`,
    color: '#fa520f',
    requiresApiKey: true,
    envVar: 'MISTRAL_API_KEY',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 128000 },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', contextWindow: 32000 },
      { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32000 },
      { id: 'codestral-latest', name: 'Codestral', contextWindow: 256000 },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    logo: `${BASE}/qwen.png`,
    color: '#615ced',
    requiresApiKey: true,
    envVar: 'DASHSCOPE_API_KEY',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen3-235b-a22b', name: 'Qwen3 235B', contextWindow: 128000 },
      { id: 'qwen3-32b', name: 'Qwen3 32B', contextWindow: 128000 },
      { id: 'qwen-max', name: 'Qwen Max', contextWindow: 128000 },
      { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 128000 },
      { id: 'qwen-turbo', name: 'Qwen Turbo', contextWindow: 128000 },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    logo: `${BASE}/groq.png`,
    color: '#f55036',
    requiresApiKey: true,
    envVar: 'GROQ_API_KEY',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-4-405b-versatile', name: 'Llama 4 405B (Groq)', contextWindow: 128000 },
      { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', contextWindow: 128000 },
      { id: 'deepseek-r1-distill-llama-70b', name: 'R1 Distill Llama 70B', contextWindow: 128000 },
      { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B', contextWindow: 128000 },
    ],
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    logo: `${BASE}/xai.png`,
    color: '#000000',
    requiresApiKey: true,
    envVar: 'XAI_API_KEY',
    defaultBaseUrl: 'https://api.x.ai/v1',
    models: [
      { id: 'grok-4', name: 'Grok 4', contextWindow: 256000, description: 'Latest Grok flagship' },
      { id: 'grok-4-fast', name: 'Grok 4 Fast', contextWindow: 128000 },
      { id: 'grok-3', name: 'Grok 3', contextWindow: 131072 },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', contextWindow: 131072 },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    logo: `${BASE}/perplexity.png`,
    color: '#20808d',
    requiresApiKey: true,
    envVar: 'PERPLEXITY_API_KEY',
    defaultBaseUrl: 'https://api.perplexity.ai',
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro', contextWindow: 200000, description: 'Web-connected with citations' },
      { id: 'sonar', name: 'Sonar', contextWindow: 127000 },
      { id: 'sonar-reasoning', name: 'Sonar Reasoning', contextWindow: 127000 },
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', contextWindow: 127000 },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    logo: `${BASE}/together.png`,
    color: '#0f6fff',
    requiresApiKey: true,
    envVar: 'TOGETHER_API_KEY',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    models: [
      { id: 'meta-llama/Llama-4-405B', name: 'Llama 4 405B', contextWindow: 128000 },
      { id: 'Qwen/Qwen3-235B-A22B', name: 'Qwen3 235B', contextWindow: 128000 },
      { id: 'deepseek-ai/DeepSeek-V3.2', name: 'DeepSeek V3.2', contextWindow: 128000 },
    ],
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    logo: `${BASE}/fireworks.png`,
    color: '#ef4444',
    requiresApiKey: true,
    envVar: 'FIREWORKS_API_KEY',
    defaultBaseUrl: 'https://api.fireworks.ai/inference/v1',
    models: [
      { id: 'accounts/fireworks/models/llama4-405b-instruct-basic', name: 'Llama 4 405B', contextWindow: 128000 },
      { id: 'accounts/fireworks/models/qwen3-235b-a22b-instruct', name: 'Qwen3 235B', contextWindow: 128000 },
      { id: 'accounts/fireworks/models/deepseek-v3.2', name: 'DeepSeek V3.2', contextWindow: 128000 },
    ],
  },
];

export function findModel(modelId: string): { provider: ModelProvider; model: any } | null {
  for (const p of PROVIDERS) {
    const m = p.models.find((mm) => mm.id === modelId);
    if (m) return { provider: p, model: m };
  }
  return null;
}

export const ALL_MODELS = PROVIDERS.flatMap((p) =>
  p.models.map((m) => ({ ...m, providerId: p.id, providerName: p.name, providerLogo: p.logo })),
);
