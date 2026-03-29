import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@^2";

// ============================================================
// CONFLUX ROUTER — /v1/chat/completions
// Auth → Credit check → Route to provider → Stream response → Deduct credits
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Types ---

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface ModelRoute {
  model_alias: string;
  provider: string;
  provider_model_id: string;
  credit_cost_per_1k_in: number;
  credit_cost_per_1k_out: number;
  max_tokens: number;
  context_window: number;
  tier: string;
  enabled: boolean;
  fallback_model: string | null;
}

interface ProviderConfig {
  provider: string;
  api_key_encrypted: string;
  base_url: string;
  enabled: boolean;
}

// --- Cache (in-memory for this function instance) ---
let modelRoutesCache: Map<string, ModelRoute> = new Map();
let providerCache: Map<string, ProviderConfig> = new Map();
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

async function loadCaches() {
  if (Date.now() - cacheTime < CACHE_TTL && modelRoutesCache.size > 0) return;

  const { data: routes } = await supabase
    .from("model_routes")
    .select("*")
    .eq("enabled", true);

  const { data: providers } = await supabase
    .from("provider_config")
    .select("*")
    .eq("enabled", true);

  if (routes) {
    modelRoutesCache = new Map(routes.map((r: ModelRoute) => [r.model_alias, r]));
  }
  if (providers) {
    providerCache = new Map(providers.map((p: ProviderConfig) => [p.provider, p]));
  }
  cacheTime = Date.now();
}

// --- Auth ---

async function authenticate(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  // Check if it's an API key (cf_live_ or cf_test_ prefix)
  if (token.startsWith("cf_live_") || token.startsWith("cf_test_")) {
    const keyHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const hashHex = Array.from(new Uint8Array(keyHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data } = await supabase
      .from("api_keys")
      .select("user_id, is_active, expires_at")
      .eq("key_hash", hashHex)
      .single();

    if (!data || !data.is_active) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", hashHex);

    return { userId: data.user_id };
  }

  // Otherwise, treat as Supabase JWT
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return { userId: user.id };
}

// --- Credit Check ---

async function checkCredits(
  userId: string,
  modelAlias: string,
  estimatedTokensIn: number,
  estimatedTokensOut: number
): Promise<{ hasCredits: boolean; estimatedCost: number; balance: number; tier: string }> {
  const { data, error } = await supabase.rpc("check_user_credits", {
    p_user_id: userId,
    p_model_alias: modelAlias,
    p_estimated_tokens_in: estimatedTokensIn,
    p_estimated_tokens_out: estimatedTokensOut,
  });

  // If user has no credits (0 balance from missing row), auto-create with free tier
  if (error || !data || data.length === 0 || data[0]?.current_balance === 0) {
    console.log(`Auto-creating credit account for user ${userId}`, { error: error?.message });
    const { error: upsertError } = await supabase
      .from("credit_accounts")
      .upsert({
        user_id: userId,
        balance: 500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Failed to auto-create credit account:", upsertError);
    }

    // Retry the check
    const { data: retryData, error: retryError } = await supabase.rpc("check_user_credits", {
      p_user_id: userId,
      p_model_alias: modelAlias,
      p_estimated_tokens_in: estimatedTokensIn,
      p_estimated_tokens_out: estimatedTokensOut,
    });

    console.log("Retry credit check:", { retryData, retryError: retryError?.message });

    if (retryData && retryData.length > 0) {
      const result = retryData[0];
      return {
        hasCredits: result.has_credits,
        estimatedCost: result.estimated_cost,
        balance: result.current_balance,
        tier: result.model_tier,
      };
    }

    // Still failed — return 500 free credits as fallback
    return { hasCredits: true, estimatedCost: 1, balance: 500, tier: "core" };
  }

  const result = data[0];
  return {
    hasCredits: result.has_credits,
    estimatedCost: result.estimated_cost,
    balance: result.current_balance,
    tier: result.model_tier,
  };
}

// --- Provider Call ---

async function callProvider(
  providerConfig: ProviderConfig,
  modelId: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  stream: boolean
): Promise<Response> {
  const apiKey = providerConfig.api_key_encrypted;

  if (providerConfig.provider === "anthropic") {
    // Anthropic API format
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages.filter((m) => m.role !== "system");

    return fetch(`${providerConfig.base_url}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        temperature,
        system: systemMsg?.content,
        messages: chatMsgs,
        stream,
      }),
    });
  }

  if (providerConfig.provider === "google") {
    // Google Gemini API format
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === "system");

    return fetch(
      `${providerConfig.base_url}/models/${modelId}:${stream ? "streamGenerateContent" : "generateContent"}?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction.content }] }
            : undefined,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
          },
        }),
      }
    );
  }

  // OpenAI-compatible (OpenAI, Cerebras, Groq, etc.)
  return fetch(`${providerConfig.base_url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream,
    }),
  });
}

// --- Token Counting (rough estimate) ---

function estimateTokens(text: string): number {
  // Rough: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

// --- CORS ---

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

// --- Main Handler ---

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // --- GET /v1/models — List available models ---
    if (req.method === "GET" && path.endsWith("/v1/models")) {
      await loadCaches();
      const models = Array.from(modelRoutesCache.values())
        .filter((r) => r.enabled)
        .map((r) => ({
          id: r.model_alias,
          provider: r.provider,
          tier: r.tier,
          context_window: r.context_window,
          max_tokens: r.max_tokens,
          credits_per_1k_input: r.credit_cost_per_1k_in,
          credits_per_1k_output: r.credit_cost_per_1k_out,
        }));

      return new Response(JSON.stringify({ data: models }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // --- GET /v1/credits — User's credit balance ---
    if (req.method === "GET" && path.endsWith("/v1/credits")) {
      const auth = await authenticate(req);
      if (!auth) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      let { data } = await supabase
        .from("credit_accounts")
        .select("balance, total_purchased, total_consumed")
        .eq("user_id", auth.userId)
        .single();

      // Auto-create if missing
      if (!data) {
        await supabase
          .from("credit_accounts")
          .upsert({
            user_id: auth.userId,
            balance: 500,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        data = { balance: 500, total_purchased: 0, total_consumed: 0 };
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // --- GET /v1/usage — User's usage history ---
    if (req.method === "GET" && path.endsWith("/v1/usage")) {
      const auth = await authenticate(req);
      if (!auth) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const limit = parseInt(url.searchParams.get("limit") ?? "50");
      const { data } = await supabase
        .from("usage_log")
        .select("*")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 200));

      return new Response(JSON.stringify({ data: data ?? [] }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // --- POST /v1/chat/completions — The main router ---
    if (req.method === "POST" && path.endsWith("/v1/chat/completions")) {
      const startTime = Date.now();

      // 1. Auth
      const auth = await authenticate(req);
      if (!auth) {
        return new Response(JSON.stringify({ error: "Unauthorized", message: "Invalid or missing API key" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // 2. Parse request
      const body: ChatRequest = await req.json();
      const { model, messages, max_tokens = 4096, temperature = 0.7, stream = false } = body;

      if (!model || !messages || messages.length === 0) {
        return new Response(JSON.stringify({ error: "Bad request", message: "model and messages are required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // 3. Load caches + resolve model
      await loadCaches();
      const route = modelRoutesCache.get(model);

      if (!route) {
        return new Response(JSON.stringify({ error: "Model not found", message: `Unknown model: ${model}` }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // 4. Credit check
      const estimatedTokensIn = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
      const estimatedTokensOut = max_tokens;
      const creditCheck = await checkCredits(auth.userId, model, estimatedTokensIn, estimatedTokensOut);

      if (!creditCheck.hasCredits) {
        return new Response(
          JSON.stringify({
            error: "Insufficient credits",
            message: `Need ~${creditCheck.estimatedCost} credits, have ${creditCheck.balance}`,
            balance: creditCheck.balance,
            estimated_cost: creditCheck.estimatedCost,
          }),
          {
            status: 402,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }

      // 5. Resolve provider
      const providerConfig = providerCache.get(route.provider);
      if (!providerConfig) {
        return new Response(JSON.stringify({ error: "Provider unavailable", message: `Provider ${route.provider} is not configured` }), {
          status: 503,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // 6. Call provider
      const providerResponse = await callProvider(
        providerConfig,
        route.provider_model_id,
        messages,
        Math.min(max_tokens, route.max_tokens),
        temperature,
        stream
      );

      const latencyMs = Date.now() - startTime;

      // 7. Handle errors from provider
      if (!providerResponse.ok) {
        const errorBody = await providerResponse.text();
        console.error(`Provider error [${route.provider}/${route.provider_model_id}]:`, providerResponse.status, errorBody);

        // Try fallback if available
        if (route.fallback_model) {
          const fallbackRoute = modelRoutesCache.get(route.fallback_model);
          if (fallbackRoute) {
            const fallbackProvider = providerCache.get(fallbackRoute.provider);
            if (fallbackProvider) {
              const fallbackResponse = await callProvider(
                fallbackProvider,
                fallbackRoute.provider_model_id,
                messages,
                Math.min(max_tokens, fallbackRoute.max_tokens),
                temperature,
                stream
              );

              if (fallbackResponse.ok) {
                // Deduct credits for fallback
                const tokensIn = estimatedTokensIn;
                const tokensOut = estimateTokens(await fallbackResponse.clone().text());
                await supabase.rpc("deduct_credits", {
                  p_user_id: auth.userId,
                  p_model_alias: model,
                  p_tokens_in: tokensIn,
                  p_tokens_out: tokensOut,
                  p_provider: fallbackRoute.provider,
                  p_status: "success",
                  p_latency_ms: Date.now() - startTime,
                });

                return new Response(fallbackResponse.body, {
                  status: fallbackResponse.status,
                  headers: {
                    ...CORS_HEADERS,
                    "Content-Type": fallbackResponse.headers.get("Content-Type") ?? "application/json",
                    "X-Conflux-Provider": fallbackRoute.provider,
                    "X-Conflux-Model": fallbackRoute.model_alias,
                    "X-Conflux-Fallback": "true",
                  },
                });
              }
            }
          }
        }

        // Log failed attempt
        try {
          await supabase.rpc("deduct_credits", {
            p_user_id: auth.userId,
            p_model_alias: model,
            p_tokens_in: 0,
            p_tokens_out: 0,
            p_provider: route.provider,
            p_status: "error",
            p_latency_ms: latencyMs,
          });
        } catch (e) {
          console.error("Error logging failed call:", e);
        }

        return new Response(JSON.stringify({ error: "Provider error", message: errorBody }), {
          status: providerResponse.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // 8. Success — deduct credits and return response
      const responseBody = await providerResponse.text();
      let tokensIn = estimatedTokensIn;
      let tokensOut = estimatedTokensOut;

      // Try to extract actual token counts from provider response
      try {
        const parsed = JSON.parse(responseBody);
        if (parsed.usage) {
          tokensIn = parsed.usage.prompt_tokens ?? tokensIn;
          tokensOut = parsed.usage.completion_tokens ?? tokensOut;
        }
      } catch {
        // Streaming or non-JSON — use estimates
        tokensOut = estimateTokens(responseBody);
      }

      // Deduct credits + log usage
      try {
        const { error: rpcError } = await supabase.rpc("deduct_credits", {
          p_user_id: auth.userId,
          p_model_alias: model,
          p_tokens_in: tokensIn,
          p_tokens_out: tokensOut,
          p_provider: route.provider,
          p_status: "success",
          p_latency_ms: latencyMs,
        });
        if (rpcError) console.error("Credit deduction failed:", rpcError);
      } catch (e) {
        console.error("Credit deduction exception:", e);
      }

      return new Response(responseBody, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": providerResponse.headers.get("Content-Type") ?? "application/json",
          "X-Conflux-Provider": route.provider,
          "X-Conflux-Model": route.model_alias,
          "X-Conflux-Credits-Charged": String(
            Math.ceil(tokensIn / 1000) * route.credit_cost_per_1k_in +
            Math.ceil(tokensOut / 1000) * route.credit_cost_per_1k_out
          ),
        },
      });
    }

    // --- 404 ---
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Conflux Router error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", message: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
