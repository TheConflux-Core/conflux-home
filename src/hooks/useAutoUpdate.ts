import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';

interface UpdateState {
  available: boolean;
  version?: string;
  date?: string;
  body?: string;
  downloading: boolean;
  downloaded: boolean;
  error?: string;
}

/**
 * Checks for updates on mount (and every 30 min).
 * Shows a banner when an update is available.
 * Download is triggered manually by user click.
 */
export function useAutoUpdate() {
  const [state, setState] = useState<UpdateState>({
    available: false,
    downloading: false,
    downloaded: false,
  });

  // Check for updates on mount + every 30 min
  useEffect(() => {
    let cancelled = false;

    async function checkForUpdate() {
      try {
        const update = await check();
        if (cancelled || !update) return;

        setState({
          available: true,
          version: update.version,
          date: update.date,
          body: update.body,
          downloading: false,
          downloaded: false,
        });
      } catch (err: any) {
        // Silent fail — don't nag user if update server is unreachable
        console.log('[updater] check failed:', err?.message ?? err);
      }
    }

    checkForUpdate();
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Download + install + relaunch
  const install = async () => {
    setState((s) => ({ ...s, downloading: true, error: undefined }));
    try {
      const update = await check();
      if (!update) {
        setState((s) => ({ ...s, downloading: false, error: 'Update no longer available' }));
        return;
      }

      await update.downloadAndInstall((event) => {
        if (event.event === 'Finished') {
          setState((s) => ({ ...s, downloading: false, downloaded: true }));
        }
      });
      // Update installed — user should restart the app
    } catch (err: any) {
      console.error('[updater] install failed:', err);
      setState((s) => ({
        ...s,
        downloading: false,
        error: err?.message ?? 'Update failed',
      }));
    }
  };

  const dismiss = () => {
    setState({ available: false, downloading: false, downloaded: false });
  };

  return { ...state, install, dismiss };
}
