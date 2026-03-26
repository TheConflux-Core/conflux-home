import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { invoke } from '@tauri-apps/api/core';

async function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    await invoke('write_updater_log', { entry: line });
  } catch {
    console.log('[updater] could not write log:', message);
  }
}

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

        await logToFile(`Update available: v${update.version}`);
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

  // Download + install using custom Rust commands (follows redirects)
  const install = async () => {
    setState((s) => ({ ...s, downloading: true, error: undefined }));
    try {
      const update = await check();
      if (!update) {
        setState((s) => ({ ...s, downloading: false, error: 'Update no longer available' }));
        return;
      }

      // Get the download URL from the update metadata
      const rawJson = update.rawJson as Record<string, unknown>;
      const downloadUrl = rawJson.url as string;
      
      await logToFile(`rawJson: ${JSON.stringify(rawJson)}`);
      await logToFile(`downloadUrl: ${downloadUrl || 'undefined'}`);
      
      if (!downloadUrl) {
        setState((s) => ({ ...s, downloading: false, error: 'No download URL found' }));
        return;
      }

      await logToFile(`Downloading version ${update.version} from ${downloadUrl}`);

      // Use custom Rust download (follows GitHub redirects)
      const filePath = await invoke<string>('download_update_file', { url: downloadUrl });
      await logToFile(`Downloaded to: ${filePath}`);

      setState((s) => ({ ...s, downloading: false, downloaded: true }));
      await logToFile('Download complete. Ready to install.');

      // Run the installer
      await invoke('run_installer', { installerPath: filePath });
      await logToFile('Installer launched.');
    } catch (err: any) {
      const errorMessage = err?.message ?? err?.toString() ?? JSON.stringify(err) ?? 'Update failed';
      await logToFile(`ERROR: ${errorMessage}`);
      setState((s) => ({
        ...s,
        downloading: false,
        error: errorMessage,
      }));
    }
  };

  const dismiss = () => {
    setState({ available: false, downloading: false, downloaded: false });
  };

  return { ...state, install, dismiss };
}
