import type { ModelProvider } from '@/types';

// All logos sourced from lobehub/lobe-icons (light variants, transparent PNG)
// https://github.com/lobehub/lobe-icons
const BASE = 'https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light';

// IMPORTANT: model IDs must match what openclaude CLI actually accepts.
// - For Anthropic: openclaude accepts aliases (sonnet, opus, haiku) OR full
//   names (claude-sonnet-4-5, claude-opus-4-1, etc.)
// - For Gemini: openclaude accepts full Gemini model names (gemini-2.5-pro,
//   gemini-2.5-flash, etc.)
// - For OpenAI-compatible providers (OpenAI, DeepSeek, Z.AI, OpenRouter,
//   Groq, etc.): the model name is passed via the OPENAI_MODEL env var, so
//   it can be any string the provider's API accepts.
// - For Ollama: model name passed via OPENAI_MODEL env var (e.g. llama3.2).
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
      // Use openclaude's built-in aliases — these ALWAYS resolve to the latest
      { id: 'sonnet', name: 'Claude Sonnet (latest)', contextWindow: 200000, description: 'Alias para o Sonnet mais recente — recomendado' },
      { id: 'opus', name: 'Claude Opus (latest)', contextWindow: 200000, description: 'Alias para o Opus mais recente — mais capaz' },
      { id: 'haiku', name: 'Claude Haiku (latest)', contextWindow: 200000, description: 'Alias para o Haiku mais recente — rápido e barato' },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', contextWindow: 200000, description: 'Sonnet 4.5 (fixo)' },
      { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', contextWindow: 200000, description: 'Opus 4.1 (fixo)' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', contextWindow: 200000, description: 'Haiku 4.5 (fixo)' },
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', contextWindow: 200000, description: 'Geração anterior' },
      { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', contextWindow: 200000, description: 'Geração anterior' },
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
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, description: 'Multimodal flagship' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', contextWindow: 128000, description: 'Rápido e barato' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, description: 'GPT-4 com visão' },
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1047576, description: 'Janela de contexto enorme' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', contextWindow: 1047576 },
      { id: 'o1', name: 'o1', contextWindow: 200000, description: 'Modelo de raciocínio' },
      { id: 'o1-mini', name: 'o1-mini', contextWindow: 128000 },
      { id: 'o3', name: 'o3', contextWindow: 200000, description: 'Raciocínio avançado' },
      { id: 'o3-mini', name: 'o3-mini', contextWindow: 200000 },
      { id: 'o4-mini', name: 'o4-mini', contextWindow: 200000, description: 'Raciocínio rápido' },
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
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 2000000, description: 'Pro mais recente — contexto massivo' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1000000, description: 'Flash mais recente' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1000000 },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', contextWindow: 1000000, description: 'Versão econômica' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000, description: 'Geração anterior' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000, description: 'Geração anterior' },
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
      { id: 'deepseek-chat', name: 'DeepSeek V3 (chat)', contextWindow: 64000, description: 'Modelo principal DeepSeek' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (reasoner)', contextWindow: 64000, description: 'Modelo de raciocínio R1' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', contextWindow: 64000, description: 'Especializado em código' },
    ],
  },
  {
    id: 'zai',
    name: 'Z.AI (GLM)',
    logo: `${BASE}/zai.png`,
    color: '#1e6fff',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    models: [
      { id: 'glm-4.5', name: 'GLM-4.5', contextWindow: 128000, description: 'GLM flagship' },
      { id: 'glm-4.5-air', name: 'GLM-4.5 Air', contextWindow: 128000, description: 'Versão leve' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', contextWindow: 128000, description: 'Tier gratuito' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus', contextWindow: 128000 },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    logo: `${BASE}/openrouter.png`,
    color: '#6366f1',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5 (via OR)', contextWindow: 200000 },
      { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1 (via OR)', contextWindow: 200000 },
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OR)', contextWindow: 128000 },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (via OR)', contextWindow: 2000000 },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (via OR)', contextWindow: 1000000 },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (via OR)', contextWindow: 64000 },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (via OR)', contextWindow: 128000 },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B (via OR)', contextWindow: 128000 },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    logo: `${BASE}/ollama.png`,
    color: '#000000',
    requiresApiKey: false,
    defaultBaseUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'llama3.3', name: 'Llama 3.3 70B', contextWindow: 128000 },
      { id: 'llama3.2', name: 'Llama 3.2', contextWindow: 128000 },
      { id: 'qwen2.5:32b', name: 'Qwen 2.5 32B', contextWindow: 128000 },
      { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B', contextWindow: 128000 },
      { id: 'deepseek-r1:70b', name: 'DeepSeek R1 70B', contextWindow: 128000 },
      { id: 'deepseek-r1:32b', name: 'DeepSeek R1 32B', contextWindow: 128000 },
      { id: 'mistral', name: 'Mistral', contextWindow: 32000 },
      { id: 'gemma2:27b', name: 'Gemma 2 27B', contextWindow: 8000 },
      { id: 'phi4', name: 'Phi-4', contextWindow: 16000 },
      { id: 'codellama', name: 'Code Llama', contextWindow: 16000 },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    logo: `${BASE}/mistral.png`,
    color: '#fa520f',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 128000 },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', contextWindow: 32000 },
      { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32000 },
      { id: 'codestral-latest', name: 'Codestral', contextWindow: 256000, description: 'Especializado em código' },
      { id: 'open-mistral-nemo', name: 'Mistral Nemo', contextWindow: 128000 },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    logo: `${BASE}/qwen.png`,
    color: '#615ced',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-max', name: 'Qwen Max', contextWindow: 32768 },
      { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 131072 },
      { id: 'qwen-turbo', name: 'Qwen Turbo', contextWindow: 1000000 },
      { id: 'qwen2.5-72b-instruct', name: 'Qwen 2.5 72B', contextWindow: 131072 },
      { id: 'qwen2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', contextWindow: 131072 },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    logo: `${BASE}/groq.png`,
    color: '#f55036',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', contextWindow: 128000 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', contextWindow: 128000 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768 },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192 },
      { id: 'deepseek-r1-distill-llama-70b', name: 'R1 Distill Llama 70B', contextWindow: 128000 },
    ],
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    logo: `${BASE}/xai.png`,
    color: '#000000',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://api.x.ai/v1',
    models: [
      { id: 'grok-2', name: 'Grok 2', contextWindow: 131072 },
      { id: 'grok-2-vision', name: 'Grok 2 Vision', contextWindow: 32768, description: 'Multimodal' },
      { id: 'grok-beta', name: 'Grok Beta', contextWindow: 131072 },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    logo: `${BASE}/perplexity.png`,
    color: '#20808d',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://api.perplexity.ai',
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro', contextWindow: 200000, description: 'Web + citações' },
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
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B', contextWindow: 128000 },
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B', contextWindow: 128000 },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', contextWindow: 128000 },
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', contextWindow: 128000 },
    ],
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    logo: `${BASE}/fireworks.png`,
    color: '#ef4444',
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    defaultBaseUrl: 'https://api.fireworks.ai/inference/v1',
    models: [
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B', contextWindow: 128000 },
      { id: 'accounts/fireworks/models/qwen2p5-72b-instruct', name: 'Qwen 2.5 72B', contextWindow: 128000 },
      { id: 'accounts/fireworks/models/deepseek-v3', name: 'DeepSeek V3', contextWindow: 128000 },
      { id: 'accounts/fireworks/models/llama4-maverick-instruct-basic', name: 'Llama 4 Maverick', contextWindow: 1000000 },
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
