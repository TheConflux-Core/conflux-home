/**
 * Force-sync the current Supabase session to the Rust engine.
 * Call this before every engine_chat/engine_chat_stream invocation
 * to ensure the engine has a fresh JWT.
 */

import { invoke } from "@tauri-apps/api/core";
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// Cache: avoid refreshing multiple times within this window
const SYNC_COOLDOWN_MS = 10_000; // 10 seconds
let lastSyncAt = 0;
let lastSyncResult = false;
let syncInProgress: Promise<boolean> | null = null;

export async function syncSessionToEngine(): Promise<boolean> {
  const now = Date.now();

  // If a sync is already in-flight, wait for it instead of starting another
  if (syncInProgress) {
    console.log("[syncSessionToEngine] Sync already in progress, waiting...");
    return syncInProgress;
  }

  // If we synced recently and it succeeded, skip
  if (now - lastSyncAt < SYNC_COOLDOWN_MS && lastSyncResult) {
    console.log("[syncSessionToEngine] Skipping — synced recently");
    return true;
  }

  syncInProgress = doSync();
  const result = await syncInProgress;
  syncInProgress = null;
  lastSyncAt = Date.now();
  lastSyncResult = result;
  return result;
}

async function doSync(): Promise<boolean> {
  try {
    // Get the current session
    let { data: { session } } = await supabase.auth.getSession();

    // If no session, try to restore from storage
    if (!session) {
      console.log("[syncSessionToEngine] No session in memory, checking storage...");
      const { data: { session: restored } } = await supabase.auth.getSession();
      session = restored;
    }

    // Check if the token is still valid (not expired)
    // If the token has more than 60s left, just re-sync it without refreshing
    if (session?.access_token && session.expires_at) {
      const expiresAtMs = session.expires_at * 1000;
      const remainingMs = expiresAtMs - Date.now();

      if (remainingMs > 60_000) {
        // Token still valid — just sync to engine without refresh
        console.log(`[syncSessionToEngine] Token still valid (${Math.round(remainingMs / 1000)}s remaining), syncing without refresh`);
        await invoke("set_supabase_session", {
          supabaseUrl: SUPABASE_URL,
          supabaseAnonKey: SUPABASE_ANON_KEY,
          accessToken: session.access_token,
          userId: session.user.id,
        });
        return true;
      }
    }

    // Token missing or expiring soon — refresh
    console.log("[syncSessionToEngine] Refreshing session...");
    const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn("[syncSessionToEngine] Failed to refresh session:", error.message);
      await supabase.auth.signOut();
      console.log("[syncSessionToEngine] Cleared stale session, user must re-authenticate");
      return false;
    }
    session = refreshed;

    if (!session?.access_token || !session?.user?.id) {
      console.warn("[syncSessionToEngine] No active session after refresh");
      return false;
    }

    console.log(`[syncSessionToEngine] Syncing token: ${session.access_token.substring(0, 10)}...`);

    await invoke("set_supabase_session", {
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      accessToken: session.access_token,
      userId: session.user.id,
    });

    return true;
  } catch (err) {
    console.error("[syncSessionToEngine] Failed:", err);
    return false;
  }
}
