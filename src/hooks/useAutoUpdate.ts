import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';

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

  // Download + install using update URL from updates.json (already has correct tag + platform)
  const install = async () => {
    setState((s) => ({ ...s, downloading: true, error: undefined }));
    try {
      const update = await check();
      if (!update) {
        setState((s) => ({ ...s, downloading: false, error: 'Update no longer available' }));
        return;
      }

      // Detect platform + arch
      const ua = navigator.userAgent.toLowerCase();
      const isMac = ua.includes('mac') || ua.includes('darwin');
      const isWindows = ua.includes('win');
      const isArm64 = ua.includes('aarch64') || ua.includes('arm64');

      // Pick platform key matching Tauri's updater format
      let platformKey: string;
      if (isMac) {
        platformKey = isArm64 ? 'darwin-aarch64' : 'darwin-x86_64';
      } else if (isWindows) {
        platformKey = 'windows-x86_64';
      } else {
        platformKey = 'linux-x86_64';
      }

      // Use the URL directly from updates.json — already has the correct release tag (handles vv prefix)
      const raw = update.rawJson as any;
      const platformEntry = raw?.platforms?.[platformKey];
      const downloadUrl = platformEntry?.url;

      await logToFile(`Platform: ${platformKey}`);
      await logToFile(`Version from updates.json: ${update.version}`);
      await logToFile(`Download URL from updates.json: ${downloadUrl ?? 'NONE'}`);
      
      if (!downloadUrl) {
        setState((s) => ({ ...s, downloading: false, error: `No download URL for platform ${platformKey}` }));
        return;
      }

      await logToFile(`Downloading version ${update.version} from ${downloadUrl}`);

      // Use custom Rust download (follows GitHub redirects)
      const filePath = await invoke<string>('download_update_file', { url: downloadUrl });
      await logToFile(`Downloaded to: ${filePath}`);

      setState((s) => ({ ...s, downloading: false, downloaded: true }));
      await logToFile('Download complete. Ready to install.');

      // Run the installer (spawns NSIS /S in background)
      await invoke('run_installer', { installerPath: filePath });
      await logToFile('Installer launched. Exiting gracefully...');

      // Give the installer a moment to start, then exit gracefully
      await new Promise(r => setTimeout(r, 500));
      await exit(0);
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
