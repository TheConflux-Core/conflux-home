// Auto-detect internet connectivity with lightweight ping
// Falls back gracefully — no false negatives from browser offline events
//
// Uses multiple fallback URLs to avoid false offline detection on mobile
// (some networksblock or rate-limit specific hosts)

import { useState, useEffect, useCallback, useRef } from 'react';

// Multiple ping targets — if one fails, try the next
const PING_URLS = [
  'https://www.google.com/generate_204',   // Fast 204 (primary)
  'https://httpbin.org/get',                // Simple GET (fallback 1)
  'https://www.gstatic.com/generate_204',  // Google alt (fallback 2)
];
const PING_INTERVAL_MS = 20_000; // Check every 20s (was 15s — less aggressive on mobile battery)
const PING_TIMEOUT_MS = 5_000;
const CONSECUTIVE_FAILURES_THRESHOLD = 2; // Require 2+ failures before declaring offline

export interface NetworkStatus {
  online: boolean;
  checking: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const failCountRef = useRef(0);

  const check = useCallback(async () => {
    // Cancel previous ping
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setChecking(true);
    let succeeded = false;

    // Try each ping URL until one succeeds
    for (const url of PING_URLS) {
      if (succeeded) break;
      try {
        const res = await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store',
        });
        // no-cors hides response status, but if we get here without throwing,
        // the network layer succeeded
        succeeded = true;
      } catch {
        // Try next URL
      }
    }

    if (succeeded) {
      failCountRef.current = 0;
      setOnline(true);
    } else {
      failCountRef.current += 1;
      // Only go offline after consecutive failures to avoid flapping
      if (failCountRef.current >= CONSECUTIVE_FAILURES_THRESHOLD) {
        setOnline(false);
      }
      // If under threshold, keep current state (don't falsely go offline)
    }

    setChecking(false);
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, PING_INTERVAL_MS);

    // Also listen for browser online/offline as a hint to check immediately
    const onOnline = () => check();
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [check]);

  return { online, checking };
}
