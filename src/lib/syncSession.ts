/**
 * Force-sync the current Supabase session to the Rust engine.
 * Call this before every engine_chat/engine_chat_stream invocation
 * to ensure the engine has a fresh JWT.
 */

import { invoke } from "@tauri-apps/api/core";
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export async function syncSessionToEngine(): Promise<boolean> {
  try {
    // Get the current session
    let { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token || !session?.user?.id) {
      console.warn("[syncSessionToEngine] No active session");
      return false;
    }

    // Check if token is still valid (not expired)
    // Only refresh if expiring within 60 seconds
    if (session.expires_at) {
      const expiresAtMs = session.expires_at * 1000;
      const remainingMs = expiresAtMs - Date.now();

      if (remainingMs < 60_000) {
        console.log("[syncSessionToEngine] Token expiring soon, refreshing...");
        const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn("[syncSessionToEngine] Failed to refresh session:", error.message);
          await supabase.auth.signOut();
          return false;
        }
        session = refreshed;
        if (!session?.access_token || !session?.user?.id) {
          console.warn("[syncSessionToEngine] No active session after refresh");
          return false;
        }
      }
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
