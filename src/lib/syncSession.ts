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
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token || !session?.user?.id) {
      console.warn("[syncSessionToEngine] No active session");
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
