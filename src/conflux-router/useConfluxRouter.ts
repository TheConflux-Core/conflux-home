// Conflux Router — React Hook
// Drop-in replacement for GatewayClient chat that uses Conflux Router instead.

import { useState, useCallback, useRef, useEffect } from 'react';
import { ConfluxRouter } from './router';
import type { RouterChatMessage, RouterChatResponse, UserQuota } from './types';
import { QuotaExceededError } from './types';
import { remainingCalls } from './quota';

interface UseConfluxRouterOptions {
  userId: string;
  tier?: 'free' | 'pro' | 'team';
  model?: string; // default: 'conflux-fast'
}

interface UseConfluxRouterReturn {
  /** Send a message and get a streaming response */
  send: (message: string) => Promise<string>;
  /** Whether a request is in flight */
  isLoading: boolean;
  /** Error message, if any */
  error: string | null;
  /** Current quota info */
  quota: UserQuota | null;
  /** Remaining free calls today */
  remainingCalls: number;
  /** Whether the user has hit their quota limit */
  isQuotaExceeded: boolean;
  /** The router instance (for advanced use) */
  router: ConfluxRouter;
}

export function useConfluxRouter(options: UseConfluxRouterOptions): UseConfluxRouterReturn {
  const { userId, tier = 'free', model = 'conflux-fast' } = options;

  const routerRef = useRef<ConfluxRouter>(new ConfluxRouter(userId, tier));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<UserQuota | null>(null);

  // Start health monitoring on mount
  useEffect(() => {
    const router = routerRef.current;
    router.start();
    setQuota(router.getQuota());
    return () => router.stop();
  }, [userId, tier]);

  const send = useCallback(
    async (message: string): Promise<string> => {
      const router = routerRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const response = await router.chat({
          model,
          messages: [{ role: 'user', content: message }],
          stream: false,
        });

        setQuota(router.getQuota());

        return response.choices?.[0]?.message?.content ?? '';
      } catch (err) {
        if (err instanceof QuotaExceededError) {
          setError('You\'ve used all 50 free calls today! Upgrade to Pro for unlimited access.');
          setQuota(err.quota);
        } else {
          const msg = err instanceof Error ? err.message : 'Something went wrong';
          setError(msg);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [model],
  );

  return {
    send,
    isLoading,
    error,
    quota,
    remainingCalls: quota ? remainingCalls(quota) : 50,
    isQuotaExceeded: quota ? !remainingCalls(quota) : false,
    router: routerRef.current,
  };
}

// ── Streaming version ──

interface UseConfluxStreamReturn {
  /** Send a message with streaming chunks */
  sendStream: (message: string, onChunk: (text: string) => void) => Promise<string>;
  /** Whether a stream is active */
  isStreaming: boolean;
  /** Error message, if any */
  error: string | null;
  /** Cancel the current stream */
  cancel: () => void;
  /** Current quota info */
  quota: UserQuota | null;
  /** Remaining free calls today */
  remainingCalls: number;
}

export function useConfluxStream(options: UseConfluxRouterOptions): UseConfluxStreamReturn {
  const { userId, tier = 'free', model = 'conflux-fast' } = options;

  const routerRef = useRef<ConfluxRouter>(new ConfluxRouter(userId, tier));
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<UserQuota | null>(null);

  useEffect(() => {
    const router = routerRef.current;
    router.start();
    setQuota(router.getQuota());
    return () => {
      router.stop();
      abortRef.current?.abort();
    };
  }, [userId, tier]);

  const sendStream = useCallback(
    async (message: string, onChunk: (text: string) => void): Promise<string> => {
      const router = routerRef.current;
      abortRef.current = new AbortController();
      setIsStreaming(true);
      setError(null);

      try {
        const fullText = await router.chatStream(
          {
            model,
            messages: [{ role: 'user', content: message }],
            stream: true,
          },
          onChunk,
          abortRef.current.signal,
        );

        setQuota(router.getQuota());
        return fullText;
      } catch (err) {
        if (err instanceof QuotaExceededError) {
          setError('Daily limit reached. Upgrade to Pro for unlimited calls.');
          setQuota(err.quota);
        } else if ((err as Error).message !== 'Aborted') {
          setError(err instanceof Error ? err.message : 'Stream failed');
        }
        throw err;
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [model],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    sendStream,
    isStreaming,
    error,
    cancel,
    quota,
    remainingCalls: quota ? remainingCalls(quota) : 50,
  };
}
