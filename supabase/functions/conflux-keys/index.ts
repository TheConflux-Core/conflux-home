import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@^2";

// ============================================================
// CONFLUX ROUTER — API Key Management
// POST /v1/keys/generate — Create a new API key
// GET  /v1/keys           — List user's API keys
// POST /v1/keys/revoke    — Revoke an API key
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

async function authenticate(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

async function generateApiKey(): Promise<{ fullKey: string; hash: string; prefix: string }> {
  // Generate 32 random bytes
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const keyBody = Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 40); // 40 char body

  const fullKey = `cf_live_${keyBody}`;
  const prefix = fullKey.slice(0, 16); // 'cf_live_XXXXXXXX'

  // Hash the full key for storage
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(fullKey)
  );
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { fullKey, hash, prefix };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // --- POST /v1/keys/generate ---
    if (req.method === "POST" && path.endsWith("/keys/generate")) {
      const userId = await authenticate(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => ({}));
      const name = body.name ?? "Default Key";
      const expiresIn = body.expires_in_days ?? null;

      const { fullKey, hash, prefix } = await generateApiKey();

      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 86400000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: userId,
          key_hash: hash,
          key_prefix: prefix,
          name,
          expires_at: expiresAt,
        })
        .select("id, key_prefix, name, is_active, created_at, expires_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Return the full key ONCE — it cannot be retrieved again
      return new Response(
        JSON.stringify({
          ...data,
          api_key: fullKey,
          warning: "Save this key now. It cannot be retrieved later.",
        }),
        {
          status: 201,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // --- GET /v1/keys ---
    if (req.method === "GET" && path.endsWith("/keys")) {
      const userId = await authenticate(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const { data } = await supabase
        .from("api_keys")
        .select("id, key_prefix, name, is_active, last_used_at, created_at, expires_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ data: data ?? [] }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // --- POST /v1/keys/revoke ---
    if (req.method === "POST" && path.endsWith("/keys/revoke")) {
      const userId = await authenticate(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const { key_id } = await req.json();
      if (!key_id) {
        return new Response(JSON.stringify({ error: "key_id required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", key_id)
        .eq("user_id", userId); // can only revoke own keys

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ revoked: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("API Key management error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
