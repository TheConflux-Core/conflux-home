# Studio — Creator Workspace Build Spec

> **Sprint:** Vault + Studio (The Gravity Well)
> **Status:** SPEC READY — Build next session
> **Created:** 2026-03-27

---

## Vision

One unified creator workspace inside Conflux Home. Users describe what they want in natural language, the AI router dispatches to the right generation engine, output saves to Vault. No tool-switching, no separate subscriptions.

**Design identity:** Electric gradient (purple → cyan → white). Deep black background with animated gradient mesh. The prompt bar is the hero.

---

## Architecture

### One App, Six Modules

```
Studio
├── 🖼️ Image — text-to-image, style transfer, upscaling, background removal
├── 🎬 Video — text-to-video, lip-sync, avatar generation
├── 🎵 Music — text-to-music, sound effects, podcast editing
├── 🗣️ Voice — voice cloning, TTS, voice customization
├── 💻 Web — website builder, game scaffolding, deploy
└── 🎨 Design — logos, social media templates, presentations
```

### The "Just Ask" Flow

User types what they want → AI router detects intent → dispatches to right engine:

- "Make me a logo for a coffee shop" → Image engine
- "Write me a jingle" → Music engine
- "Build me a landing page" → Web engine
- "Clone my voice saying welcome" → Voice engine

Module tabs exist for power users, but default is: **type → generate → save**.

### Common Flow (Shared Across All Modules)

1. **Prompt input** — natural language + optional style/settings panel
2. **Engine dispatch** — router picks the right model/provider
3. **Generation** — progress indicator, streaming if supported
4. **Output preview** — type-specific renderer
5. **Save to Vault** — one click, auto-tags, links to prompt & agent
6. **Remix** — "make it darker", "try different style" — conversational iteration
7. **History** — everything generated, browsable, re-iterable

---

## Visual Layout

```
┌─────────────────────────────────────────────┐
│  Studio                                     │
│  ┌──────┬──────┬──────┬──────┬──────┬─────┐ │
│  │ 🖼️   │ 🎬   │ 🎵   │ 🗣️   │ 💻   │ 🎨  │ │
│  │Image │Video │Music │Voice │ Web  │Design│ │
│  └──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬──┘ │
│     │      │      │      │      │      │    │
│  ┌──▼──────▼──────▼──────▼──────▼──────▼──┐ │
│  │                                         │ │
│  │         [Describe what you want]        │ │
│  │         ┌─────────────────────┐         │ │
│  │         │ Prompt input bar    │         │ │
│  │         └─────────────────────┘         │ │
│  │         [ Generate ▶ ]                  │ │
│  │                                         │ │
│  │  ┌─────────────────────────────────┐    │ │
│  │  │      OUTPUT PREVIEW AREA        │    │ │
│  │  │  (adapts to content type)       │    │ │
│  │  │                                 │    │ │
│  │  │  Image → full canvas preview    │    │ │
│  │  │  Video → player + timeline      │    │ │
│  │  │  Audio → waveform + controls    │    │ │
│  │  │  Code  → editor + live preview  │    │ │
│  │  │  Voice → waveform + play btn    │    │ │
│  │  │  Design → canvas + layers       │    │ │
│  │  │                                 │    │ │
│  │  └─────────────────────────────────┘    │ │
│  │                                         │ │
│  │  [ 💾 Save to Vault ]  [ 🔄 Remix ]    │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌── Generation History ──────────────────┐  │
│  │ 🖼️ Logo v3  │ 🎵 Jingle  │ 🖼️ Banner  │  │
│  └───────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## Module Specs

### 🖼️ Image Module

**Features:**
- Text-to-image generation
- Image-to-image (style transfer, variations)
- Upscaling (2x, 4x)
- Background removal
- Inpainting (edit specific areas)
- Aspect ratio selection (1:1, 16:9, 9:16, 4:3)

**API Options (research needed — ranked by quality/cost):**
| Provider | Models | Pricing | Quality |
|----------|--------|---------|---------|
| OpenRouter | Flux, SD3.5 | Per-request | Good |
| Replicate | Flux, SDXL, Playground | Per-second compute | Excellent |
| Stability AI | SD3.5, Stable Image | Per-credit | Excellent |
| Together AI | Flux, SDXL | Per-request | Good |
| fal.ai | Flux, SDXL, Real-ESRGAN | Per-second compute | Excellent |

**Output:** PNG/JPG, auto-saved to Vault

---

### 🎬 Video Module

**Features:**
- Text-to-video
- Image-to-video (animate a still)
- Video upscaling
- Short-form content (5-15s clips)

**API Options:**
| Provider | Models | Pricing | Quality |
|----------|--------|---------|---------|
| Runway | Gen-3 Alpha | Per-second | Best |
| Pika | Pika 1.0 | Per-credit | Good |
| Replicate | Stable Video Diffusion | Per-second | Good |
| fal.ai | Various | Per-second | Good |

**Output:** MP4/WebM, auto-saved to Vault
**Note:** Most expensive module. Save for after revenue starts.

---

### 🎵 Music Module

**Features:**
- Text-to-music (describe genre, mood, length)
- Sound effects generation
- Stem separation (vocals/instruments)
- Loop/sample generation

**API Options:**
| Provider | Models | Pricing | Quality |
|----------|--------|---------|---------|
| Suno | Suno v3.5 | Per-generation | Best |
| Replicate | MusicGen, AudioCraft | Per-second | Good |
| Udio | Udio v1 | Per-generation | Excellent |
| Stability AI | Stable Audio | Per-credit | Good |

**Output:** MP3/WAV, auto-saved to Vault

---

### 🗣️ Voice Module

**Features:**
- Text-to-speech (multiple voices, languages)
- Voice cloning (from sample audio)
- Speech-to-speech (change voice characteristics)
- SSML control (speed, pitch, emphasis)

**API Options:**
| Provider | Models | Pricing | Quality |
|----------|--------|---------|---------|
| ElevenLabs | Eleven v2 | Per-character | Best |
| Replicate | XTTS v2, Bark | Per-second | Good |
| Play.ht | Play 2.0 | Per-character | Excellent |
| Coqui | XTTS (open source) | Self-hosted | Good |

**Output:** MP3/WAV, auto-saved to Vault

---

### 💻 Web Module

**Features:**
- Describe a website → get working HTML/CSS/JS
- Describe a game → get scaffolded code
- Live preview: spin up local server, open in browser
- Edit code directly with syntax highlighting
- One-click deploy to Vercel/Netlify
- Save projects to Vault

**Approach:**
- LLM generates complete HTML/CSS/JS (or React)
- Tauri spawns a local HTTP server on a random port
- Opens `localhost:PORT` in the system browser via `open` crate
- User sees live result immediately
- Code is editable in a built-in editor (CodeMirror or Monaco)
- No drag-and-drop complexity — code-first, preview-second

**API Options:**
| Provider | Models | Use Case |
|----------|--------|----------|
| OpenRouter | Claude, GPT-4o, Gemini | Full site generation |
| Local LLM | Llama 3.1, Qwen | Simple pages, offline |
| Together AI | CodeLlama, DeepCoder | Code-focused |

**Output:** Project folder → Vault, deployable to Vercel/Netlify CLI

---

### 🎨 Design Module

**Features:**
- Logo generation (reuses Image engine + prompting)
- Social media template generation
- Presentation deck scaffolding
- Brand kit generation (colors, fonts, logo variations)

**Approach:** Mostly reuses Image module with specialized prompts and templates. SVG generation via LLM for logos. Canva-like template system is a future enhancement.

---

## Pricing Architecture

### Tier Structure

| Tier | Price | What's Included |
|------|-------|-----------------|
| **Free** | $0/mo | 10 image gens/mo, 2 music gens/mo, basic TTS, web preview only |
| **Creator** | $14.99/mo | 500 image gens, 50 music, 20 video clips, 100k TTS chars, web deploy |
| **Pro** | $29.99/mo | Unlimited image, 200 music, 100 video, 500k TTS chars, priority queue, commercial license |
| **BYOK** | $9.99/mo | Bring your own API keys, unlimited everything, Conflux UI + agents only |

### Pay-As-You-Go Option
- Fund account balance ($10, $25, $50 increments)
- Each generation deducts from balance based on model cost + 30% markup
- Balance never expires
- Works alongside or instead of subscription tiers

### Cost Model (Approximate)
| Generation Type | Avg Cost to Us | Charged to User |
|----------------|----------------|-----------------|
| Image (Flux) | $0.003-0.01 | $0.02-0.05 |
| Video (5s clip) | $0.10-0.50 | $0.25-1.00 |
| Music (30s) | $0.02-0.05 | $0.10-0.15 |
| Voice TTS (1k chars) | $0.01-0.03 | $0.05 |
| Web page gen | $0.01-0.05 | included in tier |
| Voice clone | $0.10-0.30 | $0.50-1.00 |

---

## API Keys Needed

### Required for Image Module (start here)
- [ ] **Replicate API token** — covers Image, Video, Music, Voice (most versatile)
- [ ] **OpenRouter API key** — already have this, covers Flux + LLM fallback

### Required for Premium Tiers
- [ ] **Stability AI API key** — SD3.5, Stable Image, Stable Audio
- [ ] **ElevenLabs API key** — best voice cloning + TTS
- [ ] **Suno API key** — best music generation
- [ ] **Runway API key** — best video generation

### Optional / Later
- [ ] fal.ai — fast inference, good for upscaling
- [ ] Together AI — cheap image + code gen
- [ ] Play.ht — TTS alternative
- [ ] Pika — video alternative
- [ ] Vercel token — for web deploy
- [ ] Netlify token — for web deploy

### Research Tasks Before Build
1. Compare Replicate vs direct API for each module (cost, latency, reliability)
2. Check which providers offer free tiers for testing
3. Evaluate self-hosted options (ComfyUI, XTTS, MusicGen) for BYOK tier
4. Rate limit policies across providers
5. Commercial licensing terms for generated content

---

## Build Order

1. **Studio shell** — prompt bar, module tabs, output area, generation history, electric gradient CSS
2. **Image module** — Replicate/OpenRouter integration, full pipeline
3. **Web module** — LLM code gen, local server, browser preview, Vault project save
4. **Music module** — MusicGen via Replicate or Suno integration
5. **Voice module** — ElevenLabs or XTTS via Replicate
6. **Video module** — Runway or Stable Video (after revenue)
7. **Design module** — reuses Image engine + specialized prompts
8. **Pricing/billing** — Stripe integration, tier enforcement, balance system

---

## Tauri Commands (Planned)

```rust
// Studio shell
studio_generate_image(prompt, style, aspect_ratio, model?) -> GenerationResult
studio_generate_video(prompt, duration, model?) -> GenerationResult
studio_generate_music(prompt, genre, duration, model?) -> GenerationResult
studio_generate_voice(text, voice_id, model?) -> GenerationResult
studio_generate_code(prompt, framework?) -> CodeResult
studio_generate_design(prompt, template_type?) -> GenerationResult

// Generation management
studio_get_history(limit, offset, type_filter?) -> Vec<Generation>
studio_get_generation(id) -> Generation
studio_delete_generation(id) -> ()
studio_remix_generation(id, remix_prompt) -> GenerationResult

// Settings
studio_get_models() -> Vec<ModelInfo>
studio_get_usage() -> UsageStats
studio_get_balance() -> f64
```

---

## DB Tables (Planned)

```sql
CREATE TABLE studio_generations (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,        -- 'image' | 'video' | 'music' | 'voice' | 'code' | 'design'
    prompt TEXT NOT NULL,
    remix_of TEXT,               -- parent generation id if remix
    model TEXT NOT NULL,         -- model used
    provider TEXT NOT NULL,      -- 'replicate' | 'openrouter' | etc
    status TEXT NOT NULL,        -- 'pending' | 'generating' | 'complete' | 'failed'
    output_path TEXT,            -- local file path
    output_url TEXT,             -- provider URL if applicable
    metadata_json TEXT,          -- dimensions, duration, format, etc
    cost_cents INTEGER DEFAULT 0,
    vault_file_id TEXT,          -- linked vault file
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE studio_prompts (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    module TEXT NOT NULL,
    use_count INTEGER DEFAULT 1,
    last_used TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE studio_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    month TEXT NOT NULL,         -- 'YYYY-MM'
    module TEXT NOT NULL,
    generation_count INTEGER DEFAULT 0,
    total_cost_cents INTEGER DEFAULT 0
);
```

---

## Next Session Checklist

- [ ] Get Replicate API token (primary provider)
- [ ] Get ElevenLabs API key (for voice)
- [ ] Decide: start with Studio shell or jump straight to Image module?
- [ ] Set up Replicate webhook/callback handling for async generation
- [ ] Design the electric gradient CSS system
- [ ] Build → test → commit cycle (proven 3-batch pattern)
