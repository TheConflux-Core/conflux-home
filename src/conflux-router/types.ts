// Conflux Router — Type Definitions
// The routing layer that replaces OpenRouter dependency for Conflux Home.

// ── Provider Config ──

export type ProviderTier = 'free' | 'paid';
export type ApiFormat = 'openai' | 'native';
export type Capability = 'chat' | 'image' | 'tts' | 'stt';
export type ModelQuality = 'basic' | 'good' | 'excellent';
export type UserTier = 'free' | 'pro' | 'team';

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerDay: number;
  tokensPerMinute: number;
}

export interface ModelConfig {
  id: string;              // provider's model name (e.g. "gemini-2.0-flash")
  alias: string;           // our friendly alias (e.g. "conflux-fast")
  maxTokens: number;
  costPer1kTokens: number; // 0 for free tier
  quality: ModelQuality;
}

export interface Provider {
  id: string;              // unique id: "google-gemini", "groq-llama", etc.
  name: string;            // display name: "Google Gemini"
  tier: ProviderTier;
  apiFormat: ApiFormat;
  baseUrl: string;
  apiKeyEnv?: string;      // env var name for the API key (pooled keys)
  apiKey?: string;          // direct key (for testing / embedded)
  models: ModelConfig[];
  rateLimit: RateLimit;
  healthEndpoint: string;
  priority: number;        // lower = try first
  capabilities: Capability[];
  headers?: Record<string, string>; // extra headers needed
}

// ── User Quota ──

export interface UserQuota {
  userId: string;
  tier: UserTier;
  callsToday: number;
  maxCallsPerDay: number;
  tokensToday: number;
  lastReset: string;       // ISO date string (midnight UTC)
}

// ── Health Status ──

export interface ProviderHealth {
  providerId: string;
  healthy: boolean;
  latencyMs: number;
  lastCheck: Date;
  errorCount: number;
}

// ── Router Config ──

export interface RouterConfig {
  /** User tier determines provider pool and quota */
  userTier: UserTier;
  /** Custom provider list (uses defaults if omitted) */
  providers?: Provider[];
  /** Quota storage key prefix */
  storageKeyPrefix?: string;
  /** Health check interval in ms (default: 60000) */
  healthCheckIntervalMs?: number;
}

// ── Chat Request / Response (OpenAI-compatible) ──

export interface RouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RouterChatRequest {
  model: string;           // our alias: "conflux-fast", "conflux-smart"
  messages: RouterChatMessage[];
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface RouterChatChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string | null;
}

export interface RouterChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;           // the actual model used
  choices: RouterChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  _conflux: {
    providerId: string;
    providerName: string;
    latencyMs: number;
    quotaRemaining: number;
  };
}

export interface RouterStreamChunk {
  choices: Array<{
    delta: { content?: string; role?: string };
    index: number;
    finish_reason: string | null;
  }>;
}

// ── Errors ──

export class QuotaExceededError extends Error {
  constructor(public readonly quota: UserQuota) {
    super('Daily free call limit reached. Upgrade to Pro for unlimited calls.');
    this.name = 'QuotaExceededError';
  }
}

export class NoHealthyProviderError extends Error {
  constructor(public readonly modelAlias: string) {
    super(`No healthy provider available for model "${modelAlias}".`);
    this.name = 'NoHealthyProviderError';
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// ── TTS Request / Response ──

export interface RouterTTSRequest {
  text: string;
  voice?: string;          // voice id (provider-specific)
  model?: string;          // e.g. "conflux-voice"
  speed?: number;          // 0.25 to 4.0
}

export interface RouterTTSResponse {
  audioUrl: string;        // data: URL or blob URL of the audio
  durationMs: number;
  format: 'mp3' | 'wav' | 'ogg';
  _conflux: {
    providerId: string;
    providerName: string;
    latencyMs: number;
    charactersUsed: number;
    quotaRemaining: number;
  };
}

// ── Image Generation Request / Response ──

export interface RouterImageRequest {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  model?: string;          // e.g. "conflux-image"
  n?: number;              // number of images (default 1)
}

export interface RouterImageResponse {
  images: Array<{
    url: string;           // data: URL or blob URL
    revisedPrompt?: string;
  }>;
  _conflux: {
    providerId: string;
    providerName: string;
    latencyMs: number;
    imagesGenerated: number;
    quotaRemaining: number;
  };
}
