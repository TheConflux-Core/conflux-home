// Conflux Home — Email Hook
// Manages SMTP email configuration and testing via Tauri engine commands.

import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface EmailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  tls: boolean;
}

export interface UseEmailResult {
  config: EmailConfig | null;
  loading: boolean;
  saving: boolean;
  testing: boolean;
  error: string | null;
  save: (config: EmailConfig) => Promise<void>;
  load: () => Promise<void>;
  test: (to: string) => Promise<void>;
}

export function useEmail(): UseEmailResult {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<EmailConfig | null>('engine_get_email_config');
      setConfig(result);
    } catch (err) {
      console.error('[useEmail] Failed to load config:', err);
      setError('Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (cfg: EmailConfig) => {
    setSaving(true);
    setError(null);
    try {
      await invoke('engine_set_email_config', {
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        password: cfg.password,
        fromAddress: cfg.fromAddress,
        tls: cfg.tls,
      });
      setConfig(cfg);
    } catch (err) {
      console.error('[useEmail] Failed to save config:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const test = useCallback(async (to: string) => {
    setTesting(true);
    setError(null);
    try {
      await invoke('engine_send_notification', {
        req: {
          title: 'Conflux Home Email Test',
          body: `Test email sent to ${to} — SMTP connection verified.`,
          channel: 'email',
        },
      });
    } catch (err) {
      console.error('[useEmail] Failed to send test email:', err);
      throw err;
    } finally {
      setTesting(false);
    }
  }, []);

  // Load config on mount
  useEffect(() => {
    load();
  }, [load]);

  return {
    config,
    loading,
    saving,
    testing,
    error,
    save,
    load,
    test,
  };
}
