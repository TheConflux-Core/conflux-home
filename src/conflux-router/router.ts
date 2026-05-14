// Conflux Router — Core Router
// The main routing engine. Selects providers, sends requests, handles failover.

import type {
  Provider,
  RouterChatRequest,
  RouterChatResponse,
  RouterStreamChunk,
  UserQuota,
  UserTier,
  ModelConfig,
} from './types';
import {
  QuotaExceededError,
  NoHealthyProviderError,
  ProviderError,
} from './types';
import {
  getProvidersForAlias,
  findModelForAlias,
  getProvidersForTier,
} from './providers';
import {
  loadQuota,
  hasQuota,
  incrementQuota,
  remainingCalls,
} from './quota';
import {
  isProviderHealthy,
  startHealthMonitor,
  checkAllProviders,
} from './health';

// ── Round Robin State ──

const roundRobinCounters = new Map<string, number>();

function roundRobinSelect(providers: Provider[]): Provider {
  if (providers.length === 0) {
    throw new Error('No providers available for round-robin');
  }

  const key = providers.map((p) => p.id).join(',');
  const counter = (roundRobinCounters.get(key) ?? 0) % providers.length;
  roundRobinCounters.set(key, counter + 1);

  return providers[counter];
}

// ── Main Router Class ──

export class ConfluxRouter {
  private userId: string;
  private tier: UserTier;
  private quota: UserQuota;
  private cleanupHealthMonitor: (() => void) | null = null;

  constructor(userId: string, tier: UserTier = 'free') {
    this.userId = userId;
    this.tier = tier;
    this.quota = loadQuota(userId, tier);
  }

  // ── Lifecycle ──

  /** Start health monitoring for all providers */
  start(): void {
    const providers = getProvidersForTier(this.tier);
    this.cleanupHealthMonitor = startHealthMonitor(providers);
  }

  /** Stop health monitoring */
  stop(): void {
    this.cleanupHealthMonitor?.();
    this.cleanupHealthMonitor = null;
  }

  // ── Quota ──

  getQuota(): UserQuota {
    // Reload to pick up any changes
    this.quota = loadQuota(this.userId, this.tier);
    return this.quota;
  }

  getRemainingCalls(): number {
    return remainingCalls(this.getQuota());
  }

  // ── Chat Completion (non-streaming) ──

  async chat(request: RouterChatRequest): Promise<RouterChatResponse> {
    // 1. Check quota
    this.quota = loadQuota(this.userId, this.tier);
    if (!hasQuota(this.quota)) {
      throw new QuotaExceededError(this.quota);
    }

    // 2. Select provider + model
    const { provider, model } = this.selectProviderAndModel(request.model);

    // 3. Build the request for this provider
    const providerRequest = this.buildProviderRequest(provider, model, request, false);

    // 4. Send request with failover
    const startTime = Date.now();
    const response = await this.sendWithFailover(provider, model, providerRequest, request.model, false);
    const latencyMs = Date.now() - startTime;

    // 5. Parse and normalize response
    const normalized = await this.normalizeResponse(provider, response, latencyMs);

    // 6. Increment quota
    const tokensUsed = normalized.usage?.total_tokens ?? 0;
    this.quota = incrementQuota(this.quota, tokensUsed);

    // 7. Add Conflux metadata
    normalized._conflux = {
      providerId: provider.id,
      providerName: provider.name,
      latencyMs,
      quotaRemaining: remainingCalls(this.quota),
    };

    return normalized;
  }

  // ── Chat Completion (streaming) ──

  async chatStream(
    request: RouterChatRequest,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    // 1. Check quota
    this.quota = loadQuota(this.userId, this.tier);
    if (!hasQuota(this.quota)) {
      throw new QuotaExceededError(this.quota);
    }

    // 2. Select provider + model
    const { provider, model } = this.selectProviderAndModel(request.model);

    // 3. Build the request
    const providerRequest = this.buildProviderRequest(provider, model, request, true);

    // 4. Send streaming request with failover
    const fullText = await this.sendStreamWithFailover(
      provider, model, providerRequest, request.model, onChunk, signal,
    );

    // 5. Increment quota (estimate tokens from text length)
    const estimatedTokens = Math.ceil(fullText.length / 4);
    this.quota = incrementQuota(this.quota, estimatedTokens);

    return fullText;
  }

  // ── Provider Selection ──

  private selectProviderAndModel(alias: string): { provider: Provider; model: ModelConfig } {
    const candidates = getProvidersForAlias(alias, this.tier);

    if (candidates.length === 0) {
      throw new NoHealthyProviderError(alias);
    }

    // Filter to healthy providers
    const healthy = candidates.filter((p) => isProviderHealthy(p.id));

    if (healthy.length === 0) {
      // All providers unhealthy — try them anyway (health check might be stale)
      console.warn(`[ConfluxRouter] All providers for "${alias}" marked unhealthy. Trying anyway.`);
      const provider = candidates[0];
      const model = findModelForAlias(provider, alias);
      if (!model) throw new NoHealthyProviderError(alias);
      return { provider, model };
    }

    // Round-robin across healthy providers
    const provider = roundRobinSelect(healthy);
    const model = findModelForAlias(provider, alias);

    if (!model) {
      throw new NoHealthyProviderError(alias);
    }

    return { provider, model };
  }

  // ── Request Building ──

  private buildProviderRequest(
    provider: Provider,
    model: ModelConfig,
    request: RouterChatRequest,
    stream: boolean,
  ): object {
    // Base OpenAI-compatible format
    const base = {
      model: model.id,
      messages: request.messages,
      stream,
      max_tokens: request.maxTokens ?? model.maxTokens,
      ...(request.temperature !== undefined && { temperature: request.temperature }),
    };

    // Provider-specific adjustments
    if (provider.apiFormat === 'native') {
      // Future: convert to provider-specific format
      // For now, all our providers support OpenAI-compatible format
      return base;
    }

    return base;
  }

  // ── Request Sending with Failover ──

  private async sendWithFailover(
    primaryProvider: Provider,
    model: ModelConfig,
    body: object,
    alias: string,
    stream: false,
  ): Promise<Response> {
    const providers = getProvidersForAlias(alias, this.tier);
    const attempts = [primaryProvider, ...providers.filter((p) => p.id !== primaryProvider.id)];

    let lastError: Error | null = null;

    for (const provider of attempts) {
      // Rebuild model for this specific provider
      const providerModel = findModelForAlias(provider, alias);
      if (!providerModel) continue;

      try {
        const url = `${provider.baseUrl}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...provider.headers,
        };

        if (provider.apiKey) {
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
        }

        // Rebuild request body with this provider's model ID
        const providerBody = { ...(body as Record<string, unknown>), model: providerModel.id };

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(providerBody),
          signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => 'unknown');
          throw new ProviderError(
            `${provider.name} returned ${res.status}: ${errBody}`,
            provider.id,
            res.status,
          );
        }

        return res;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[ConfluxRouter] Provider ${provider.id} failed, trying next...`, lastError.message);
        // Continue to next provider
      }
    }

    throw lastError ?? new NoHealthyProviderError(alias);
  }

  private async sendStreamWithFailover(
    primaryProvider: Provider,
    model: ModelConfig,
    body: object,
    alias: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const providers = getProvidersForAlias(alias, this.tier);
    const attempts = [primaryProvider, ...providers.filter((p) => p.id !== primaryProvider.id)];

    let lastError: Error | null = null;

    for (const provider of attempts) {
      if (signal?.aborted) throw new Error('Aborted');

      // Rebuild model for this specific provider
      const providerModel = findModelForAlias(provider, alias);
      if (!providerModel) continue;

      try {
        const url = `${provider.baseUrl}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...provider.headers,
        };

        if (provider.apiKey) {
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
        }

        // Rebuild request body with this provider's model ID
        const providerBody = { ...(body as Record<string, unknown>), model: providerModel.id };

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(providerBody),
          signal,
        });

        if (!res.ok) {
          throw new ProviderError(`${provider.name} stream failed (${res.status})`, provider.id, res.status);
        }

        if (!res.body) {
          throw new ProviderError(`${provider.name} returned no body`, provider.id);
        }

        return await this.parseSSEStream(res.body, onChunk, signal);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[ConfluxRouter] Stream provider ${provider.id} failed, trying next...`);
      }
    }

    throw lastError ?? new NoHealthyProviderError(alias);
  }

  // ── SSE Stream Parser ──

  private async parseSSEStream(
    body: ReadableStream<Uint8Array>,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    try {
      while (true) {
        if (signal?.aborted) throw new Error('Aborted');

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') return fullText;

          if (trimmed.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(trimmed.slice(6));
              const content: string | undefined = chunk.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                onChunk(content);
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }

  // ── Response Normalization ──

  private async normalizeResponse(
    provider: Provider,
    res: Response,
    latencyMs: number,
  ): Promise<RouterChatResponse> {
    const data = await res.json();

    // If provider already returns OpenAI format, pass through
    if (provider.apiFormat === 'openai') {
      return {
        id: data.id ?? `conflux-${Date.now()}`,
        object: data.object ?? 'chat.completion',
        created: data.created ?? Math.floor(Date.now() / 1000),
        model: data.model ?? provider.models[0]?.id ?? 'unknown',
        choices: data.choices ?? [],
        usage: data.usage,
        _conflux: {
          providerId: provider.id,
          providerName: provider.name,
          latencyMs,
          quotaRemaining: remainingCalls(this.quota),
        },
      };
    }

    // Native format conversion (future: Anthropic, etc.)
    // For now, all providers are OpenAI-compatible
    return {
      id: `conflux-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: provider.models[0]?.id ?? 'unknown',
      choices: data.choices ?? [],
      usage: data.usage,
      _conflux: {
        providerId: provider.id,
        providerName: provider.name,
        latencyMs,
        quotaRemaining: remainingCalls(this.quota),
      },
    };
  }
}
