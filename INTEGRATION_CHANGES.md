# Integration Changes: Full Rust Engine + Cloud Credits

## Summary
Merged the cloud credit tracking into the Rust engine path so conversations have full personality, memory, tools, AND cloud credit billing. Removed the separate `useCloudChat` hook which was bypassing the engine entirely.

## Changes Made

### 1. Rust Backend (`src-tauri/src/commands.rs`)

#### Added `get_supabase_user_id()` helper
```rust
fn get_supabase_user_id() -> String {
    let engine = engine::get_engine();
    engine.db().get_config("supabase_user_id")
        .unwrap_or(None)
        .unwrap_or_else(|| "default".to_string())
}
```

#### Updated `set_supabase_session()` command
- Added `user_id: String` parameter
- Stores `supabase_user_id` in engine config

#### Replaced all `"default"` user IDs with real user ID
- `engine_chat`: uses `get_supabase_user_id()` for quota checks, increments, and credit operations
- `engine_chat_stream`: same fix, also added `credits_remaining` to the event payload
- `engine_get_quota`: uses real user ID
- `engine_create_session`: uses real user ID (so sessions are user-scoped, not orphaned)
- `engine_health`: uses real user ID for quota display

### 2. Frontend Auth (`src/hooks/useAuth.ts`)
- Updated `set_supabase_session` call to include `userId: session.user.id`
- Now the backend knows which Supabase user is authenticated

### 3. Engine Chat Hook (`src/hooks/useEngineChat.ts`)
- Added optional `userId` parameter to `useEngineChat(agentId, userId?)`
- On init, loads cloud credits via `get_credit_balance` call if userId is provided
- Added `credits: number` to return type (separate from `remainingCalls`)
- Updated `StreamDonePayload` to include `credits_remaining` and `credit_source`
- Emits credit updates when engine completes streaming

### 4. Chat Panel Component (`src/components/ChatPanel.tsx`)
- Removed `useCloudChat` import and usage
- Removed `useEngineChat` / `useCloudChat` split (was using cloud when authenticated)
- Now always uses `useEngineChat(agent?.id ?? null, session?.user?.id)`
- Removed unused `useCloudChat` and `getToken` references
- Cleanup imports

## Architecture

### Before (Broken)
```
User Authenticated? 
  Yes → useCloudChat → Raw edge function → No personality, no memory, no tools
  No  → useEngineChat → Full engine → Personality, memory, tools, but local-only
```

### After (Correct)
```
All users → useEngineChat → Full engine (personality, memory, tools, sessions)
                    ↓
              Cloud credit tracking (if authenticated)
                    ↓
              Conflux Router edge function (billing, routing)
```

### How It Works
1. `useEngineChat` builds system prompt from agent personality, memory, skills
2. Messages flow through local SQLite session storage
3. Engine calls `router::chat()` which talks to providers (OpenAI, Anthropic, etc.)
4. After response, `commands.rs` calls cloud functions:
   - `log_usage_to_cloud()` → stores usage in Supabase
   - `charge_credits()` → deducts from credit_accounts table
5. `engine:done` event includes `credits_remaining` for UI

## Credit Flow
```
Frontend calls engine_chat_stream()
    ↓
Rust engine processes conversation (memory, tools, etc.)
    ↓
Calls router::chat() → actual LLM API
    ↓
After response: cloud::charge_credits(user_id, ...)
    ↓
Supabase RPC deducts credits from user's account
    ↓
Returns new balance in engine:done event
    ↓
Frontend updates credits display
```

## Testing Checklist
- [ ] Chat with authenticated user → personality responds correctly (not "OpenAI")
- [ ] Credit balance decrements after each message
- [ ] Credits are fetched from Supabase, not mocked
- [ ] Free users get rate-limited (1000 calls/month) and core-tier routing
- [ ] Engine handles conversations (memory, sessions, tools) like before
- [ ] TopBar credit badge matches chat badge (both from same source)
