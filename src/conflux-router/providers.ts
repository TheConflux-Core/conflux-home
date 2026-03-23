// Conflux Router — Provider Registry
// All providers aggregated by Conflux Router. Free tier first.

import type { Provider } from './types';

// ── Default Free Tier Providers ──

export const FREE_PROVIDERS: Provider[] = [
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    tier: 'free',
    apiFormat: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: 'AIzaSyAwHEhai0OpKtEaK0cEvz0x-q6lyC6I8fE', // Pending: free tier needs enabling
    models: [
      {
        id: 'gemini-2.0-flash',
        alias: 'conflux-fast',
        maxTokens: 8192,
        costPer1kTokens: 0,
        quality: 'good',
      },
      {
        id: 'gemini-2.0-flash-lite',
        alias: 'conflux-fast',
        maxTokens: 4096,
        costPer1kTokens: 0,
        quality: 'basic',
      },
    ],
    rateLimit: {
      requestsPerMinute: 15,
      requestsPerDay: 500,
      tokensPerMinute: 1_000_000,
    },
    healthEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    priority: 1,
    capabilities: ['chat'],
  },
  {
    id: 'groq-llama',
    name: 'Groq',
    tier: 'free',
    apiFormat: 'openai', // Groq is OpenAI-compatible
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: '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',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        alias: 'conflux-fast',
        maxTokens: 8192,
        costPer1kTokens: 0,
        quality: 'good',
      },
      {
        id: 'llama-3.1-8b-instant',
        alias: 'conflux-fast',
        maxTokens: 8192,
        costPer1kTokens: 0,
        quality: 'basic',
      },
      {
        id: 'deepseek-r1-distill-llama-70b',
        alias: 'conflux-smart',
        maxTokens: 8192,
        costPer1kTokens: 0,
        quality: 'excellent',
      },
    ],
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 250,
      tokensPerMinute: 70_000,
    },
    healthEndpoint: 'https://api.groq.com/openai/v1/models',
    priority: 2,
    capabilities: ['chat'],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    tier: 'free',
    apiFormat: 'openai', // Mistral has OpenAI-compatible endpoint
    baseUrl: 'https://api.mistral.ai/v1',
    apiKey: 'H24a3cJs3bTsWkYiVgmrYPr8Xs8T4ERE',
    models: [
      {
        id: 'mistral-small-latest',
        alias: 'conflux-creative',
        maxTokens: 8192,
        costPer1kTokens: 0,
        quality: 'good',
      },
      {
        id: 'open-mistral-nemo',
        alias: 'conflux-fast',
        maxTokens: 4096,
        costPer1kTokens: 0,
        quality: 'basic',
      },
    ],
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      tokensPerMinute: 500_000,
    },
    healthEndpoint: 'https://api.mistral.ai/v1/models',
    priority: 3,
    capabilities: ['chat'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    tier: 'free',
    apiFormat: 'openai', // DeepSeek is OpenAI-compatible
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-7e96dffa53324307b11da82b6ca4b934',
    models: [
      {
        id: 'deepseek-chat',
        alias: 'conflux-creative',
        maxTokens: 8192,
        costPer1kTokens: 0,
        quality: 'good',
      },
    ],
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 500,
      tokensPerMinute: 1_000_000,
    },
    healthEndpoint: 'https://api.deepseek.com/v1/models',
    priority: 4,
    capabilities: ['chat'],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    tier: 'free',
    apiFormat: 'openai',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKey: 'csk-2kpn9eycky4ycj2dd82n6jvmhc4tjnm4ykt2vxjfvkvv9fcf',
    models: [
      {
        id: 'llama3.1-8b',
        alias: 'conflux-fast',
        maxTokens: 8192,
        costPer1kTokens: 0,
        quality: 'basic',
      },
      {
        id: 'qwen-3-235b-a22b-instruct-2507',
        alias: 'conflux-smart',
        maxTokens: 8192,
        costPer1kTokens: 0,
        quality: 'excellent',
      },
    ],
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 500,
      tokensPerMinute: 60_000,
    },
    healthEndpoint: 'https://api.cerebras.ai/v1/models',
    priority: 5,
    capabilities: ['chat'],
  },
  {
    id: 'cloudflare-workers-ai',
    name: 'Cloudflare Workers AI',
    tier: 'free',
    apiFormat: 'openai',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/36d37d313aa8598b2735b28b4211862b/ai/v1',
    apiKey: 'cfut_Ufhi1mcDzbLxwSNYZguzSlYsXy1GtAwzzo3mCir7fa5f5dab',
    models: [
      {
        id: '@cf/meta/llama-3.1-8b-instruct',
        alias: 'conflux-fast',
        maxTokens: 4096,
        costPer1kTokens: 0,
        quality: 'basic',
      },
    ],
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerDay: 10000, // 10k neurons/day
      tokensPerMinute: 100_000,
    },
    healthEndpoint: 'https://api.cloudflare.com/client/v4/user',
    priority: 6,
    capabilities: ['chat', 'image', 'stt'],
  },
];

// ── Paid Tier Providers (Pro/Team only) ──

export const PAID_PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    tier: 'paid',
    apiFormat: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'CONFLUX_OPENAI_API_KEY',
    models: [
      {
        id: 'gpt-4o',
        alias: 'conflux-smart',
        maxTokens: 16384,
        costPer1kTokens: 0.005,
        quality: 'excellent',
      },
      {
        id: 'gpt-4o-mini',
        alias: 'conflux-fast',
        maxTokens: 16384,
        costPer1kTokens: 0.00015,
        quality: 'good',
      },
    ],
    rateLimit: {
      requestsPerMinute: 500,
      requestsPerDay: 10000,
      tokensPerMinute: 2_000_000,
    },
    healthEndpoint: 'https://api.openai.com/v1/models',
    priority: 1,
    capabilities: ['chat', 'image', 'tts', 'stt'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    tier: 'paid',
    apiFormat: 'native', // Anthropic uses a different API format
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'CONFLUX_ANTHROPIC_API_KEY',
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        alias: 'conflux-smart',
        maxTokens: 16384,
        costPer1kTokens: 0.003,
        quality: 'excellent',
      },
    ],
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerDay: 1000,
      tokensPerMinute: 400_000,
    },
    healthEndpoint: 'https://api.anthropic.com/v1/models',
    priority: 2,
    capabilities: ['chat'],
    headers: {
      'anthropic-version': '2023-06-01',
    },
  },
];

// ── TTS Providers ──

export const TTS_PROVIDERS: Provider[] = [
  {
    id: 'openai-tts',
    name: 'OpenAI TTS',
    tier: 'paid',
    apiFormat: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: [
      {
        id: 'tts-1',
        alias: 'conflux-voice',
        maxTokens: 4096,
        costPer1kTokens: 0.015,  // $0.015 per 1K characters
        quality: 'good',
      },
      {
        id: 'tts-1-hd',
        alias: 'conflux-voice-hd',
        maxTokens: 4096,
        costPer1kTokens: 0.030,
        quality: 'excellent',
      },
    ],
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerDay: 5000,
      tokensPerMinute: 100_000,
    },
    healthEndpoint: 'https://api.openai.com/v1/models',
    priority: 1,
    capabilities: ['tts'],
  },
];

// ── Image Generation Providers ──

export const IMAGE_PROVIDERS: Provider[] = [
  {
    id: 'openai-image',
    name: 'OpenAI Image Gen',
    tier: 'paid',
    apiFormat: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: [
      {
        id: 'gpt-image-1',
        alias: 'conflux-image',
        maxTokens: 0,
        costPer1kTokens: 0.005,  // $0.005-0.052 per image depending on size/quality
        quality: 'excellent',
      },
      {
        id: 'dall-e-3',
        alias: 'conflux-image',
        maxTokens: 0,
        costPer1kTokens: 0.040,  // $0.040 per 1024x1024 image
        quality: 'good',
      },
    ],
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerDay: 500,
      tokensPerMinute: 0,
    },
    healthEndpoint: 'https://api.openai.com/v1/models',
    priority: 1,
    capabilities: ['image'],
  },
];

// ── Model Alias Map ──
// Maps our friendly aliases to which providers can serve them

export const ALIAS_MAP: Record<string, string[]> = {
  'conflux-fast':     ['groq-llama', 'cerebras', 'mistral', 'cloudflare-workers-ai'],
  'conflux-smart':    ['groq-llama', 'mistral'],
  'conflux-creative': ['mistral', 'groq-llama'],
  'conflux-vision':   [], // No free vision providers yet
  'conflux-imagine':  ['cloudflare-workers-ai', 'openai-image'], // Cloudflare free, OpenAI paid
  'conflux-voice':    ['openai-tts'], // OpenAI TTS (paid), add Gemini free when adapter ready
  'conflux-local':    [], // Ollama — handled separately
};

// ── Helpers ──

/** Get all providers for a given tier */
export function getProvidersForTier(tier: 'free' | 'pro' | 'team'): Provider[] {
  if (tier === 'free') {
    return [...FREE_PROVIDERS];
  }
  return [...FREE_PROVIDERS, ...PAID_PROVIDERS];
}

/** Get providers that can serve a given alias */
export function getProvidersForAlias(
  alias: string,
  tier: 'free' | 'pro' | 'team',
): Provider[] {
  const providerIds = ALIAS_MAP[alias] ?? [];
  const pool = getProvidersForTier(tier);
  return pool
    .filter((p) => providerIds.includes(p.id))
    .sort((a, b) => a.priority - b.priority);
}

/** Find the model config for a given alias on a provider */
export function findModelForAlias(
  provider: Provider,
  alias: string,
): Provider['models'][0] | null {
  return provider.models.find((m) => m.alias === alias) ?? null;
}
