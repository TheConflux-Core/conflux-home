import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Webhook {
  id: string;
  url: string;
  auth_type: string;
  auth_secret?: string;
  events: string[];
  enabled: boolean;
  created_at: string;
  last_triggered?: string;
}

export interface CreateWebhookReq {
  url: string;
  auth_type: string;
  auth_secret?: string;
  events: string[];
}

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<Webhook[]>('engine_get_webhooks');
      setWebhooks(result);
    } catch (err) {
      console.error('[useWebhooks] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (req: CreateWebhookReq): Promise<string> => {
    const id = await invoke<string>('engine_create_webhook', { req });
    await refresh();
    return id;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await invoke('engine_delete_webhook', { id });
    setWebhooks(prev => prev.filter(w => w.id !== id));
  }, []);

  return { webhooks, loading, refresh, create, remove };
}
