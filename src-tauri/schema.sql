-- Conflux Engine — Database Schema v1
-- The single source of truth for all agent state.
-- SQLite — embedded, zero-config, fast.

-- ============================================================
-- AGENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
    id              TEXT PRIMARY KEY,           -- 'zigbot', 'helix', etc.
    name            TEXT NOT NULL,              -- 'ZigBot'
    emoji           TEXT NOT NULL DEFAULT '🤖', -- display emoji
    role            TEXT NOT NULL,              -- 'Strategic Partner'
    soul            TEXT,                       -- SOUL.md content
    instructions    TEXT,                       -- AGENTS.md content
    model_alias     TEXT NOT NULL DEFAULT 'conflux-fast', -- which model alias to use
    tier            TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
    is_active       INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = disabled
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ============================================================
-- SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,           -- uuid
    agent_id        TEXT NOT NULL REFERENCES agents(id),
    user_id         TEXT NOT NULL DEFAULT 'default',
    title           TEXT,                       -- auto-generated or user-set
    status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived' | 'paused'
    message_count   INTEGER NOT NULL DEFAULT 0,
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,           -- uuid
    session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,              -- 'system' | 'user' | 'assistant' | 'tool'
    content         TEXT NOT NULL,
    tool_call_id    TEXT,                       -- if role='tool', which call this responds to
    tool_name       TEXT,                       -- if assistant triggered a tool
    tool_args       TEXT,                       -- JSON: tool arguments
    tool_result     TEXT,                       -- JSON: tool result
    tokens_used     INTEGER NOT NULL DEFAULT 0,
    model           TEXT,                       -- which model was used
    provider_id     TEXT,                       -- which provider served it
    latency_ms      INTEGER,                   -- response time
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ============================================================
-- MEMORY — Short-term (conversation context) & Long-term (facts)
-- ============================================================

CREATE TABLE IF NOT EXISTS memory (
    id              TEXT PRIMARY KEY,           -- uuid
    agent_id        TEXT NOT NULL REFERENCES agents(id),
    memory_type     TEXT NOT NULL,              -- 'fact' | 'preference' | 'skill' | 'knowledge' | 'correction'
    key             TEXT,                       -- searchable key (e.g., 'user_name', 'project_x_status')
    content         TEXT NOT NULL,              -- the actual memory content
    source          TEXT,                       -- where this came from (session_id, 'user_told', 'learned')
    confidence      REAL NOT NULL DEFAULT 1.0,  -- 0.0 to 1.0
    access_count    INTEGER NOT NULL DEFAULT 0, -- how many times recalled
    last_accessed   TEXT,
    embedding       BLOB,                       -- vector embedding for semantic search (future)
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    expires_at      TEXT                        -- NULL = permanent, or TTL for temp memories
);

CREATE INDEX IF NOT EXISTS idx_memory_agent ON memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(agent_id, key);
CREATE INDEX IF NOT EXISTS idx_memory_expires ON memory(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- TOOLS — Registry & Execution Log
-- ============================================================

CREATE TABLE IF NOT EXISTS tools (
    id              TEXT PRIMARY KEY,           -- 'web_search', 'file_read', etc.
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    parameters      TEXT NOT NULL,              -- JSON Schema for parameters
    category        TEXT NOT NULL DEFAULT 'builtin', -- 'builtin' | 'plugin' | 'external'
    permissions     TEXT NOT NULL DEFAULT '[]', -- JSON array of required permissions
    is_enabled      INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tool_executions (
    id              TEXT PRIMARY KEY,           -- uuid
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    message_id      TEXT NOT NULL REFERENCES messages(id),
    tool_id         TEXT NOT NULL REFERENCES tools(id),
    agent_id        TEXT NOT NULL,
    arguments       TEXT NOT NULL,              -- JSON
    result          TEXT,                       -- JSON response
    status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'success' | 'error'
    error           TEXT,
    duration_ms     INTEGER,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tool_exec_session ON tool_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_exec_status ON tool_executions(status);

-- ============================================================
-- TELEMETRY — Events, Metrics, Errors
-- ============================================================

CREATE TABLE IF NOT EXISTS telemetry_events (
    id              TEXT PRIMARY KEY,           -- uuid
    event_type      TEXT NOT NULL,              -- 'session_start', 'message_sent', 'tool_called', 'error', etc.
    agent_id        TEXT,
    session_id      TEXT,
    data            TEXT,                       -- JSON payload
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at DESC);

-- ============================================================
-- CRON — Scheduled Tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_jobs (
    id              TEXT PRIMARY KEY,           -- uuid
    name            TEXT NOT NULL,
    agent_id        TEXT NOT NULL REFERENCES agents(id),
    schedule        TEXT NOT NULL,              -- cron expression
    timezone        TEXT NOT NULL DEFAULT 'UTC',
    task_message    TEXT NOT NULL,              -- what to tell the agent
    is_enabled      INTEGER NOT NULL DEFAULT 1,
    last_run_at     TEXT,
    next_run_at     TEXT,
    run_count       INTEGER NOT NULL DEFAULT 0,
    error_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cron_enabled ON cron_jobs(is_enabled);
CREATE INDEX IF NOT EXISTS idx_cron_next_run ON cron_jobs(next_run_at) WHERE is_enabled = 1;

-- ============================================================
-- MISSIONS — Task Orchestration
-- ============================================================

CREATE TABLE IF NOT EXISTS missions (
    id              TEXT PRIMARY KEY,           -- uuid
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'
    priority        TEXT NOT NULL DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'critical'
    owner_agent_id  TEXT REFERENCES agents(id),
    parent_id       TEXT REFERENCES missions(id), -- for sub-missions
    data            TEXT,                       -- JSON: flexible mission data
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_owner ON missions(owner_agent_id);

-- ============================================================
-- SKILLS — Installable Capabilities
-- ============================================================

CREATE TABLE IF NOT EXISTS skills (
    id              TEXT PRIMARY KEY,           -- 'web_research', 'code_review', etc.
    name            TEXT NOT NULL,
    description     TEXT,
    version         TEXT NOT NULL DEFAULT '1.0.0',
    author          TEXT,
    instructions    TEXT NOT NULL,              -- what the agent should do
    triggers        TEXT,                       -- JSON: phrases/patterns that activate this skill
    tools_used      TEXT,                       -- JSON: tool IDs this skill requires
    is_installed    INTEGER NOT NULL DEFAULT 1,
    installed_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ============================================================
-- QUOTA — Usage Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS quota (
    user_id         TEXT NOT NULL DEFAULT 'default',
    date            TEXT NOT NULL,              -- 'YYYY-MM-DD'
    calls_used      INTEGER NOT NULL DEFAULT 0,
    tokens_used     INTEGER NOT NULL DEFAULT 0,
    providers_used  TEXT,                       -- JSON: { "groq": 15, "mistral": 10 }
    PRIMARY KEY (user_id, date)
);

-- ============================================================
-- CONFIG — Key-Value Store
-- ============================================================

CREATE TABLE IF NOT EXISTS config (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ============================================================
-- PROVIDERS — Model API Providers
-- ============================================================

CREATE TABLE IF NOT EXISTS providers (
    id              TEXT PRIMARY KEY,           -- 'cerebras', 'groq', etc.
    name            TEXT NOT NULL,
    base_url        TEXT NOT NULL,
    api_key         TEXT NOT NULL,
    model_id        TEXT NOT NULL,              -- provider's model name
    model_alias     TEXT NOT NULL DEFAULT 'conflux-fast', -- 'conflux-fast' | 'conflux-smart'
    priority        INTEGER NOT NULL DEFAULT 1, -- lower = try first
    is_enabled      INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_providers_alias ON providers(model_alias);
CREATE INDEX IF NOT EXISTS idx_providers_enabled ON providers(is_enabled);

-- ============================================================
-- PROVIDER TEMPLATES — Pre-built provider configurations
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_templates (
    id              TEXT PRIMARY KEY,           -- 'openai', 'anthropic', etc.
    name            TEXT NOT NULL,              -- 'OpenAI'
    emoji           TEXT NOT NULL DEFAULT '🔌', -- display emoji
    description     TEXT NOT NULL,              -- short description
    base_url        TEXT NOT NULL,              -- default API base URL
    models          TEXT NOT NULL,              -- JSON array of model options
    default_model   TEXT NOT NULL,              -- pre-selected model
    model_alias     TEXT NOT NULL DEFAULT 'conflux-fast',
    category        TEXT NOT NULL DEFAULT 'cloud', -- 'free' | 'cloud' | 'local'
    docs_url        TEXT,                       -- link to get API key
    is_free         INTEGER NOT NULL DEFAULT 0, -- 1 = no API key needed
    sort_order      INTEGER NOT NULL DEFAULT 0
);

-- Seed provider templates
INSERT OR IGNORE INTO provider_templates (id, name, emoji, description, base_url, models, default_model, model_alias, category, docs_url, is_free, sort_order) VALUES
    ('free-tier',    'Free Tier (Conflux)', '⚡', 'Pre-configured. No setup needed. Just works.',
     'built-in',
     '["Cerebras Llama 3.1 8B", "Groq Llama 3.1 8B", "Mistral Small", "Cloudflare Llama 3.1 8B"]',
     'Cerebras Llama 3.1 8B',
     'conflux-fast', 'free', NULL, 1, 1),
    ('openai',       'OpenAI',             '🟢', 'GPT-4o, GPT-4o-mini, and more.',
     'https://api.openai.com/v1',
     '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]',
     'gpt-4o-mini',
     'conflux-fast', 'cloud', 'https://platform.openai.com/api-keys', 0, 2),
    ('anthropic',    'Anthropic',           '🟣', 'Claude Sonnet, Opus, and Haiku.',
     'https://api.anthropic.com/v1',
     '["claude-sonnet-4-20250514", "claude-haiku-3.5-20241022", "claude-opus-4-20250514"]',
     'claude-sonnet-4-20250514',
     'conflux-smart', 'cloud', 'https://console.anthropic.com/settings/keys', 0, 3),
    ('gemini',       'Google Gemini',       '🔵', 'Gemini 2.0 Flash, 1.5 Pro, and more.',
     'https://generativelanguage.googleapis.com/v1beta/openai',
     '["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]',
     'gemini-2.0-flash',
     'conflux-fast', 'cloud', 'https://aistudio.google.com/apikey', 0, 4),
    ('ollama',       'Ollama (Local)',      '🟤', 'Run models on your own machine. Free, private, offline.',
     'http://localhost:11434/v1',
     '["llama3.1", "mistral", "codellama", "phi3", "gemma2"]',
     'llama3.1',
     'conflux-fast', 'local', 'https://ollama.com', 0, 5);

-- ============================================================
-- GOOGLE OAUTH — Token Storage
-- ============================================================

CREATE TABLE IF NOT EXISTS google_tokens (
    id              TEXT PRIMARY KEY DEFAULT 'default',
    access_token    TEXT NOT NULL,
    refresh_token   TEXT NOT NULL,
    expires_at      TEXT NOT NULL,              -- ISO-8601 when access_token expires
    scope           TEXT,                        -- granted scopes
    email           TEXT,                        -- user's email once known
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Default config values
INSERT OR IGNORE INTO config (key, value) VALUES
    ('engine_version', '1.0.0'),
    ('default_model', 'conflux-fast'),
    ('free_daily_limit', '50'),
    ('memory_search', 'fts5'),  -- 'fts5' | 'embeddings'
    ('created_at', (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));

-- ============================================================
-- MEMORY FTS5 — Full-text search index for memories
-- ============================================================

-- Virtual FTS5 table for fast memory search
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    memory_id UNINDEXED,
    agent_id UNINDEXED,
    content,
    key,
    memory_type UNINDEXED,
    tokenize='porter unicode61'
);

-- Triggers to keep FTS index in sync with memory table
CREATE TRIGGER IF NOT EXISTS memory_ai AFTER INSERT ON memory BEGIN
    INSERT INTO memory_fts(memory_id, agent_id, content, key, memory_type)
    VALUES (new.id, new.agent_id, new.content, COALESCE(new.key, ''), new.memory_type);
END;

CREATE TRIGGER IF NOT EXISTS memory_ad AFTER DELETE ON memory BEGIN
    INSERT INTO memory_fts(memory_fts, memory_id, agent_id, content, key, memory_type)
    VALUES ('delete', old.id, old.agent_id, old.content, COALESCE(old.key, ''), old.memory_type);
END;

CREATE TRIGGER IF NOT EXISTS memory_au AFTER UPDATE ON memory BEGIN
    INSERT INTO memory_fts(memory_fts, memory_id, agent_id, content, key, memory_type)
    VALUES ('delete', old.id, old.agent_id, old.content, COALESCE(old.key, ''), old.memory_type);
    INSERT INTO memory_fts(memory_id, agent_id, content, key, memory_type)
    VALUES (new.id, new.agent_id, new.content, COALESCE(new.key, ''), new.memory_type);
END;

-- ============================================================
-- SEED: Default Agents
-- ============================================================

INSERT OR IGNORE INTO agents (id, name, emoji, role, model_alias) VALUES
    ('zigbot',    'ZigBot',    '🤖', 'Strategic Partner',          'conflux-fast'),
    ('helix',     'Helix',     '🔬', 'Market Researcher',          'conflux-fast'),
    ('forge',     'Forge',     '🔨', 'Builder',                    'conflux-fast'),
    ('quanta',    'Quanta',    '✅', 'Quality Control',            'conflux-fast'),
    ('prism',     'Prism',     '💎', 'System Orchestrator',        'conflux-fast'),
    ('pulse',     'Pulse',     '📣', 'Growth Engine',              'conflux-fast'),
    ('vector',    'Vector',    '🧭', 'Business Strategist',        'conflux-smart'),
    ('spectra',   'Spectra',   '🧩', 'Task Decomposer',            'conflux-fast'),
    ('luma',      'Luma',      '🚀', 'Run Launcher',               'conflux-fast'),
    ('catalyst',  'Catalyst',  '⚡', 'Everyday Assistant',         'conflux-fast');

-- ============================================================
-- SEED: Built-in Tools
-- ============================================================

INSERT OR IGNORE INTO tools (id, name, description, parameters, category) VALUES
    ('web_search',  'Web Search',  'Search the web for information', '{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}', 'builtin'),
    ('file_read',   'File Read',   'Read the contents of a file',   '{"type":"object","properties":{"path":{"type":"string"}},"required":["path"]}', 'builtin'),
    ('file_write',  'File Write',  'Write content to a file',       '{"type":"object","properties":{"path":{"type":"string"},"content":{"type":"string"}},"required":["path","content"]}', 'builtin'),
    ('exec',        'Execute',     'Run a shell command',           '{"type":"object","properties":{"command":{"type":"string"}},"required":["command"]}', 'builtin'),
    ('calc',        'Calculator',  'Evaluate a math expression',    '{"type":"object","properties":{"expression":{"type":"string"}},"required":["expression"]}', 'builtin'),
    ('time',        'Current Time','Get the current date and time', '{"type":"object","properties":{},"required":[]}', 'builtin'),
    ('memory_read', 'Memory Read', 'Search agent memory',           '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"integer"}},"required":["query"]}', 'builtin'),
    ('memory_write','Memory Write','Store a memory',                '{"type":"object","properties":{"key":{"type":"string"},"content":{"type":"string"},"memory_type":{"type":"string"}},"required":["content"]}', 'builtin');

-- ============================================================
-- AGENT CAPABILITIES — What each agent can do
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_capabilities (
    agent_id        TEXT NOT NULL REFERENCES agents(id),
    capability      TEXT NOT NULL,  -- 'web_research', 'code_writing', 'market_analysis', etc.
    proficiency     TEXT NOT NULL DEFAULT 'expert',  -- 'basic' | 'competent' | 'expert'
    PRIMARY KEY (agent_id, capability)
);

-- Seed capabilities for our agent team
INSERT OR IGNORE INTO agent_capabilities (agent_id, capability, proficiency) VALUES
    ('zigbot',   'strategic_planning', 'expert'),
    ('zigbot',   'decision_making', 'expert'),
    ('zigbot',   'summarization', 'expert'),
    ('zigbot',   'conversation', 'expert'),
    ('helix',    'web_research', 'expert'),
    ('helix',    'market_analysis', 'expert'),
    ('helix',    'data_collection', 'expert'),
    ('helix',    'trend_identification', 'expert'),
    ('forge',    'code_writing', 'expert'),
    ('forge',    'content_creation', 'expert'),
    ('forge',    'document_generation', 'expert'),
    ('forge',    'artifact_building', 'expert'),
    ('quanta',   'quality_review', 'expert'),
    ('quanta',   'verification', 'expert'),
    ('quanta',   'testing', 'expert'),
    ('quanta',   'accuracy_checking', 'expert'),
    ('prism',    'orchestration', 'expert'),
    ('prism',    'task_decomposition', 'expert'),
    ('prism',    'workflow_management', 'expert'),
    ('prism',    'resource_allocation', 'expert'),
    ('pulse',    'marketing', 'expert'),
    ('pulse',    'content_distribution', 'expert'),
    ('pulse',    'audience_research', 'expert'),
    ('pulse',    'growth_strategy', 'expert'),
    ('vector',   'business_strategy', 'expert'),
    ('vector',   'financial_analysis', 'expert'),
    ('vector',   'opportunity_evaluation', 'expert'),
    ('vector',   'risk_assessment', 'expert'),
    ('spectra',  'task_decomposition', 'expert'),
    ('spectra',  'planning', 'expert'),
    ('spectra',  'dependency_mapping', 'expert'),
    ('luma',     'execution', 'expert'),
    ('luma',     'run_management', 'expert'),
    ('luma',     'scheduling', 'expert'),
    ('catalyst', 'conversation', 'expert'),
    ('catalyst', 'everyday_tasks', 'expert'),
    ('catalyst', 'quick_answers', 'expert');

-- ============================================================
-- AGENT PERMISSIONS — Who can talk to whom, who can do what
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_permissions (
    agent_id                TEXT NOT NULL REFERENCES agents(id) PRIMARY KEY,
    can_talk_to             TEXT NOT NULL DEFAULT '*',  -- JSON array of agent IDs, or '*' for all
    max_delegation_depth    INTEGER NOT NULL DEFAULT 2,
    max_tokens_per_session  INTEGER NOT NULL DEFAULT 0,  -- 0 = unlimited
    can_create_tasks        INTEGER NOT NULL DEFAULT 1,
    can_delete_data         INTEGER NOT NULL DEFAULT 0,
    requires_verification   INTEGER NOT NULL DEFAULT 0,  -- 1 = outputs must be verified by quanta
    anti_hallucination      INTEGER NOT NULL DEFAULT 1,  -- 1 = must verify before claiming success
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Seed permissions with our hierarchy rules
INSERT OR IGNORE INTO agent_permissions (agent_id, can_talk_to, can_create_tasks, requires_verification, anti_hallucination) VALUES
    ('zigbot',   '["helix","forge","quanta","prism","pulse","vector","spectra","luma","catalyst"]', 1, 0, 1),
    ('helix',    '["zigbot","prism","catalyst"]', 1, 0, 1),
    ('forge',    '["zigbot","prism","quanta","catalyst"]', 0, 1, 1),   -- forge outputs need verification
    ('quanta',   '["zigbot","prism","forge","catalyst"]', 0, 0, 1),
    ('prism',    '*', 1, 0, 1),                                          -- prism can orchestrate everyone
    ('pulse',    '["zigbot","prism","catalyst"]', 0, 1, 1),             -- pulse outputs need verification
    ('vector',   '["zigbot","prism","helix","catalyst"]', 0, 0, 1),
    ('spectra',  '["zigbot","prism","forge","catalyst"]', 1, 0, 1),
    ('luma',     '["zigbot","prism","forge","quanta","spectra","catalyst"]', 0, 0, 1),
    ('catalyst', '*', 1, 0, 1);                                          -- catalyst is the free-form assistant

-- ============================================================
-- VERIFICATION RECORDS — Anti-hallucination audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS verification_records (
    id              TEXT PRIMARY KEY,
    agent_id        TEXT NOT NULL REFERENCES agents(id),
    session_id      TEXT,
    claim_type      TEXT NOT NULL,  -- 'tool_result', 'task_completion', 'data_assertion', 'external_action'
    claim           TEXT NOT NULL,  -- what was claimed
    verified_by     TEXT,          -- agent ID that verified (e.g., 'quanta')
    verification    TEXT,          -- 'verified' | 'failed' | 'unverified'
    evidence        TEXT,          -- JSON: what evidence was checked
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_verification_agent ON verification_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_records(verification);

-- ============================================================
-- AGENT COMMUNICATIONS LOG — Inter-agent message audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_communications (
    id              TEXT PRIMARY KEY,
    from_agent      TEXT NOT NULL REFERENCES agents(id),
    to_agent        TEXT NOT NULL REFERENCES agents(id),
    message_type    TEXT NOT NULL,  -- 'ask' | 'delegate' | 'notify' | 'verify'
    content         TEXT NOT NULL,
    response        TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'delivered' | 'responded' | 'failed'
    session_id      TEXT,
    tokens_used     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    responded_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_comms_from ON agent_communications(from_agent);
CREATE INDEX IF NOT EXISTS idx_comms_to ON agent_communications(to_agent);
CREATE INDEX IF NOT EXISTS idx_comms_status ON agent_communications(status);

-- ============================================================
-- TASKS — Async work management
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,
    agent_id        TEXT NOT NULL REFERENCES agents(id),  -- assigned to
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked'
    result          TEXT,                               -- JSON: what the agent returned
    parent_task_id  TEXT REFERENCES tasks(id),          -- for sub-tasks
    session_id      TEXT REFERENCES sessions(id),       -- working session
    created_by      TEXT NOT NULL REFERENCES agents(id),
    priority        TEXT NOT NULL DEFAULT 'normal',     -- 'low' | 'normal' | 'high' | 'critical'
    requires_verify INTEGER NOT NULL DEFAULT 0,         -- 1 = needs quanta verification before completion
    verified        INTEGER NOT NULL DEFAULT 0,         -- 1 = verified by quanta
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- ============================================================
-- LESSONS LEARNED — Anti-repetition memory
-- ============================================================

CREATE TABLE IF NOT EXISTS lessons_learned (
    id              TEXT PRIMARY KEY,
    agent_id        TEXT REFERENCES agents(id),
    category        TEXT NOT NULL,  -- 'workflow_gap', 'bug_pattern', 'cost_waste', 'quality_issue'
    lesson          TEXT NOT NULL,
    evidence        TEXT,           -- JSON: what happened, what went wrong
    action_taken    TEXT,           -- what fix was applied
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ============================================================
-- TOOL PERMISSIONS — Extend from Phase 1
-- ============================================================
-- ============================================================

CREATE TABLE IF NOT EXISTS tool_permissions (
    agent_id        TEXT NOT NULL REFERENCES agents(id),
    tool_id         TEXT NOT NULL REFERENCES tools(id),
    is_allowed      INTEGER NOT NULL DEFAULT 1,
    max_calls_per_session INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited
    config          TEXT,                               -- JSON: tool-specific config (e.g., allowed paths)
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (agent_id, tool_id)
);

-- Seed: all agents can use all builtin tools by default
INSERT OR IGNORE INTO tool_permissions (agent_id, tool_id) SELECT id, 'web_search' FROM agents;
INSERT OR IGNORE INTO tool_permissions (agent_id, tool_id) SELECT id, 'file_read' FROM agents;
INSERT OR IGNORE INTO tool_permissions (agent_id, tool_id) SELECT id, 'file_write' FROM agents;
INSERT OR IGNORE INTO tool_permissions (agent_id, tool_id) SELECT id, 'exec' FROM agents;
INSERT OR IGNORE INTO tool_permissions (agent_id, tool_id) SELECT id, 'calc' FROM agents;
INSERT OR IGNORE INTO tool_permissions (agent_id, tool_id) SELECT id, 'time' FROM agents;
INSERT OR IGNORE INTO tool_permissions (agent_id, tool_id) SELECT id, 'memory_read' FROM agents;
INSERT OR IGNORE INTO tool_permissions (agent_id, tool_id) SELECT id, 'memory_write' FROM agents;
-- ============================================================

INSERT OR IGNORE INTO providers (id, name, base_url, api_key, model_id, model_alias, priority) VALUES
    ('cerebras',      'Cerebras',              'https://api.cerebras.ai/v1',          'csk-2kpn9eycky4ycj2dd82n6jvmhc4tjnm4ykt2vxjfvkvv9fcf', 'llama3.1-8b',                          'conflux-fast',  1),
    ('groq',          'Groq',                  'https://api.groq.com/openai/v1',      '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', 'llama-3.1-8b-instant',                 'conflux-fast',  2),
    ('mistral',       'Mistral',               'https://api.mistral.ai/v1',           'H24a3cJs3bTsWkYiVgmrYPr8Xs8T4ERE',                         'mistral-small-latest',                 'conflux-fast',  3),
    ('cloudflare',    'Cloudflare Workers AI', 'https://api.cloudflare.com/client/v4/accounts/36d37d313aa8598b2735b28b4211862b/ai/v1', 'cfut_Ufhi1mcDzbLxwSNYZguzSlYsXy1GtAwzzo3mCir7fa5f5dab', '@cf/meta/llama-3.1-8b-instruct', 'conflux-fast',  4),
    ('groq-smart',    'Groq (Smart)',          'https://api.groq.com/openai/v1',      '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', 'llama-3.3-70b-versatile',             'conflux-smart', 1),
    ('cerebras-smart','Cerebras (Smart)',       'https://api.cerebras.ai/v1',          'csk-2kpn9eycky4ycj2dd82n6jvmhc4tjnm4ykt2vxjfvkvv9fcf', 'qwen-3-235b-a22b-instruct-2507',       'conflux-smart', 2);
