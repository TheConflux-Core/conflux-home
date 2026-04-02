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

    // If no session, try to restore from storage
    if (!session) {
      console.log("[syncSessionToEngine] No session in memory, checking storage...");
      const { data: { session: restored } } = await supabase.auth.getSession();
      session = restored;
    }

    // If still no session, try to refresh (handles expired tokens)
    if (!session?.access_token) {
      console.log("[syncSessionToEngine] Attempting to refresh session...");
      const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("[syncSessionToEngine] Failed to refresh session:", error.message);
        // Clear the stale session so user is forced to re-authenticate
        await supabase.auth.signOut();
        console.log("[syncSessionToEngine] Cleared stale session, user must re-authenticate");
        return false;
      }
      session = refreshed;
    }

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
