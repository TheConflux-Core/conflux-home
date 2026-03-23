# TTS & Image Generation API Comparison for Conflux Home

**Date:** 2026-03-23
**Purpose:** Evaluate free/low-cost TTS and image generation APIs for a desktop AI agent app
**Priority:** Free tier > Low cost > Quality > Latency

---

## Executive Summary

**Best TTS Picks:**
1. **Google Gemini TTS** — Free tier via AI Studio, excellent quality, natural voices. Best free option.
2. **ElevenLabs** — 10,000 credits/month free (~20 min audio). Best quality, but free tier is limited.
3. **Browser SpeechSynthesis** — Totally free, zero latency, but robotic quality. Good fallback.
4. **Fish Audio** — 1 hour free/month. Great voice cloning, competitive pricing.

**Best Image Gen Picks:**
1. **Cloudflare Workers AI** — 10,000 free neurons/day (≈25-50 SD images). Best free tier by volume.
2. **Together AI FLUX.1 [schnell]** — $0.0027/megapixel, free credits on signup. Excellent quality/speed.
3. **Gemini 2.0 Flash Image** — Free in AI Studio (up to 1,500 images/day). Good for simple avatars.

---

## Quick Comparison Tables

### TTS Providers

| Provider | Free Tier | Paid Cost | Quality | Latency | OpenAI Compat |
|----------|-----------|-----------|---------|---------|---------------|
| Google Gemini TTS | Free via AI Studio (rate limited) | ~$0.50-3/M tokens | ★★★★☆ | ~500ms | ❌ (Gemini API) |
| ElevenLabs | 10K credits/mo (~20 min) | $0.06-0.12/1K chars | ★★★★★ | ~75ms (Flash) | ❌ (proprietary) |
| OpenAI TTS | None | $0.015/1K chars (tts-1) | ★★★★☆ | ~300ms | ✅ Native |
| OpenAI Mini-TTS | None | $12/M tokens out | ★★★★☆ | ~200ms | ✅ Native |
| Bark (Suno) | Open source (self-host) | GPU cost only | ★★★☆☆ | 5-30s | ❌ (needs wrapper) |
| Browser SpeechSynthesis | Free (unlimited) | Free | ★★☆☆☆ | <50ms | ❌ (Web API) |
| Fish Audio | 1 hr free/mo | ~$15/M chars | ★★★★☆ | ~200ms | ❌ (REST) |

### Image Generation Providers

| Provider | Free Tier | Paid Cost (per image) | Quality | Latency | OpenAI Compat |
|----------|-----------|----------------------|---------|---------|---------------|
| Cloudflare Workers AI | 10K neurons/day free | $0.011/1K neurons | ★★★☆☆ | 3-8s | ❌ (REST) |
| Together AI FLUX.1 [schnell] | Free credits on signup | $0.0027/mp (~$0.003) | ★★★★☆ | 1-3s | ❌ (REST) |
| Together AI FLUX.2 [dev] | Free credits on signup | $0.0154/image | ★★★★★ | 2-5s | ❌ (REST) |
| Gemini 2.0 Flash Image | Free in AI Studio | $0.039/image (via Together) | ★★★★☆ | 3-8s | ❌ (Gemini API) |
| Google Imagen 4 Fast | None (Vertex only) | $0.02/image | ★★★★★ | 2-4s | ❌ (Vertex API) |
| OpenAI DALL-E 3 | None | $0.04-0.12/image | ★★★★☆ | 5-10s | ✅ Native |
| OpenAI GPT Image 1 Mini | None | $0.005-0.052/image | ★★★★☆ | 3-6s | ✅ Native |
| Stability AI | 25-200 free credits (one-time) | $0.01-0.06/image | ★★★★☆ | 2-5s | ❌ (REST) |
| Hugging Face Inference | Very limited free | $0.003-0.03/image | ★★★☆☆ | 5-15s | ❌ (REST) |
| fal.ai | Limited free tier | $0.025/image (FLUX dev) | ★★★★☆ | 1-3s | ❌ (REST) |

---

## Detailed TTS Provider Analysis

### 1. Google Gemini TTS

**What it is:** Gemini's native text-to-speech generation, available through the Gemini API. Supports single-speaker and multi-speaker audio generation with natural-sounding voices.

- **API Format:** Gemini API (not OpenAI-compatible natively — needs adapter)
- **Free Tier:** Available free through Google AI Studio with rate limits (~5-15 RPM, 250K TPM, 100-1,000 RPD depending on model)
- **Paid Pricing:** Gemini 2.5 Flash TTS: ~$0.50/M input tokens, $3/M output tokens. Very cheap for short clips.
- **Quality:** ★★★★☆ — Natural, expressive voices. Good emotion control via text prompts.
- **Latency:** ~500ms typical. Acceptable for onboarding clips.
- **Voices:** 30+ voices across 24+ languages. Can control tone/emotion via prompts.
- **Special Notes:**
  - Can generate multi-speaker audio (great for agent conversations)
  - Free tier is generous for onboarding use case (5-10 short clips per user is fine)
  - NOT OpenAI-compatible — requires Gemini SDK or custom adapter
  - Quality has improved significantly with 2.5 Flash model
- **OpenAI Compatibility:** ❌ Requires Gemini SDK. Can build a thin adapter to match our router's interface.

### 2. ElevenLabs

**What it is:** Industry-leading TTS with ultra-realistic voices and voice cloning capabilities.

- **API Format:** Proprietary REST API (not OpenAI-compatible)
- **Free Tier:** 10,000 credits/month (~10,000 characters ≈ 20 minutes of audio). Non-commercial use only on free tier.
- **Paid Pricing:**
  - Starter: $5/mo — 30,000 chars, $0.08/1K extra (Flash/Turbo)
  - Creator: $22/mo — 100,000 chars, $0.11/1K extra
  - Pro: $99/mo — 500,000 chars, $0.09/1K extra
  - Flash/Turbo model: $0.06/1K chars at Business tier
- **Quality:** ★★★★★ — Best in class. Indistinguishable from human speech for many voices.
- **Latency:** ~75ms (Flash/Turbo model). Industry-leading speed.
- **Voices:** 10,000+ library + custom voice cloning
- **Special Notes:**
  - Free tier is non-commercial (problematic for our use case)
  - Voice cloning would let users create unique agent voices
  - Best quality but most expensive at scale
  - For 5 onboarding clips of ~50 chars each = 250 chars/user → free tier covers ~40 users/month
- **OpenAI Compatibility:** ❌ Proprietary. Would need adapter.

### 3. OpenAI TTS

**What it is:** OpenAI's native text-to-speech API with multiple models and voices.

- **API Format:** ✅ OpenAI-compatible (native). Our router works directly.
- **Free Tier:** None. Pay-as-you-go only.
- **Paid Pricing:**
  - tts-1: $0.015 per 1,000 characters
  - tts-1-hd: $0.030 per 1,000 characters
  - gpt-4o-mini-tts: $0.60/M input tokens + $12/M output tokens (supports voice instructions)
- **Quality:** ★★★★☆ — Good natural quality, especially HD model.
- **Latency:** ~300ms (tts-1), slightly more for HD
- **Voices:** 6 built-in voices (alloy, echo, fable, onyx, nova, shimmer). gpt-4o-mini-tts supports custom instructions.
- **Special Notes:**
  - For 5 onboarding clips × 50 chars = 250 chars → costs $0.00375/user (tts-1)
  - At 1,000 users: $3.75/month for TTS. Very affordable.
  - gpt-4o-mini-tts allows natural language voice control ("Speak in a warm, friendly tone")
  - Native OpenAI compatibility means zero integration work
- **OpenAI Compatibility:** ✅ Perfect — this is the reference implementation.

### 4. Bark (Suno)

**What it is:** Open-source text-prompted generative audio model. Can generate speech, music, and sound effects.

- **API Format:** Python library (transformers). No standard API — needs wrapper.
- **Free Tier:** Fully open source (Apache 2.0). Self-host at no cost.
- **Paid Pricing:** GPU costs only. Requires ~4-8GB VRAM. A cheap GPU VM ($0.10-0.50/hr) can run it.
- **Quality:** ★★★☆☆ — Expressive but sometimes inconsistent. Can produce artifacts.
- **Latency:** 5-30 seconds depending on hardware and text length. Too slow for onboarding.
- **Voices:** 100+ preset voices, supports voice cloning
- **Special Notes:**
  - Good for background/offline generation, not real-time
  - Can generate non-speech audio (music, sound effects)
  - Self-hosting requires GPU infrastructure
  - Can use Hugging Face Inference API as alternative to self-hosting
  - Community has many fine-tunes and improvements
- **OpenAI Compatibility:** ❌ Would need a wrapper exposing an OpenAI-compatible endpoint.

### 5. Browser SpeechSynthesis API

**What it is:** Built-in browser TTS API. Available in all modern browsers.

- **API Format:** Web Speech API (JavaScript)
- **Free Tier:** Unlimited, completely free.
- **Paid Pricing:** Free forever.
- **Quality:** ★★☆☆☆ — Robotic, clearly synthetic. Varies by OS/browser.
- **Latency:** <50ms. Instant.
- **Voices:** Depends on OS. Chrome: ~50 voices. Safari: better quality (uses macOS voices). Windows: ~20 voices.
- **Special Notes:**
  - Zero cost, zero latency, zero API dependency
  - Quality is noticeably worse than all cloud options
  - Perfect as a fallback when API calls fail
  - For a "welcome home" onboarding clip, quality matters too much for this to be primary
  - Could be OK for non-critical notifications after onboarding
  - Desktop app using Electron/Tauri can access OS-native TTS which may be better
- **OpenAI Compatibility:** ❌ Completely different API. Browser-native only.

### 6. Fish Audio

**What it is:** AI voice platform with TTS and voice cloning. Competitive pricing.

- **API Format:** REST API (not OpenAI-compatible)
- **Free Tier:** ~1 hour of free voice generation per month on free plan
- **Paid Pricing:** Pay-as-you-go based on UTF-8 bytes of input text. No subscription required for API. Pricing competitive with ElevenLabs.
- **Quality:** ★★★★☆ — High quality, especially with voice cloning
- **Latency:** ~200ms typical
- **Voices:** Extensive library + voice cloning from short samples
- **Special Notes:**
  - Good ElevenLabs alternative at lower cost
  - Voice cloning from just a few seconds of audio
  - Free tier provides enough for onboarding testing
  - Less established than ElevenLabs but growing fast
  - Open-source community models available
- **OpenAI Compatibility:** ❌ Proprietary REST API. Needs adapter.

### 7. NanoBanana TTS

**What it is:** Not found as a dedicated TTS service. "Nano Banana" appears to be a brand name for Gemini image generation models (Nano Banana Pro = Gemini 3 Pro Image, Nano Banana = Gemini Flash Image). There is no separate "NanoBanana TTS" product.

- **Status:** Does not exist as a standalone TTS service.
- **Recommendation:** Use Google Gemini TTS directly instead.

---

## Detailed Image Generation Provider Analysis

### 1. Cloudflare Workers AI

**What it is:** Serverless AI inference on Cloudflare's edge network. Includes Stable Diffusion models.

- **API Format:** REST API (Cloudflare Workers format, not OpenAI-compatible)
- **Free Tier:** 10,000 Neurons per day on free Workers plan. Resets daily at 00:00 UTC.
- **Paid Pricing:** $0.011 per 1,000 Neurons (Workers Paid plan, also gets 10K free/day)
- **Models Available:**
  - `@cf/stabilityai/stable-diffusion-xl-base-1.0` — ~200 neurons/image ≈ $0.002/image
  - `@cf/bytedance/stable-diffusion-xl-lightning` — faster, fewer neurons
  - `@cf/lykon/dreamshaper-8` — artistic style
- **Quality:** ★★★☆☆ — SDXL quality. Good but not cutting-edge compared to FLUX/DALL-E 3.
- **Latency:** 3-8 seconds. Edge-deployed so low network latency.
- **Image Size:** Typically 1024x1024
- **Special Notes:**
  - Best free tier by daily volume: ~25-50 free images/day
  - No account billing needed until you exceed free tier
  - Edge deployment means globally consistent latency
  - Can wrap in a Cloudflare Worker to expose any API format you want
  - Open source models — no vendor lock-in risk
  - Community has built free image APIs on top of this (see github.com/saurav-z/free-image-generation-api)
- **OpenAI Compatibility:** ❌ Cloudflare REST format. Can build a Worker adapter.

### 2. Gemini 2.0 Flash Image Generation

**What it is:** Google's native image generation within Gemini models. Free via AI Studio.

- **API Format:** Gemini API (not OpenAI-compatible)
- **Free Tier:** Available free via Google AI Studio. Rate limits: 5-15 RPM, 100-1,000 RPD.
- **Paid Pricing:** Via Together AI: $0.039/image. Via Gemini API direct: varies by model.
- **Models:**
  - Gemini 2.0 Flash (native image gen) — free tier
  - Gemini 3 Pro Image (Nano Banana Pro) — $0.134/image
  - Imagen 4 Fast — $0.02/image
  - Imagen 4 Ultra — $0.06/image
- **Quality:** ★★★★☆ — Good quality, especially for stylized/artistic avatars. Gemini Flash is decent for simple avatars.
- **Latency:** 3-8 seconds
- **Special Notes:**
  - Gemini 2.0 Flash free tier is the cheapest way to generate images right now
  - Can generate images inline with conversation (text+image in same call)
  - Quality varies — great for stylized/artistic, weaker on photorealism
  - Free tier rate limits are per-model; can use multiple models to get more free generations
  - Imagen 4 models are excellent quality but require paid API (Vertex AI)
  - As of March 2026, current Gemini image models may not have free tier — check latest status
- **OpenAI Compatibility:** ❌ Gemini API format. Needs adapter.

### 3. OpenAI DALL-E 3 / GPT Image

**What it is:** OpenAI's image generation models.

- **API Format:** ✅ OpenAI-compatible (native). Our router works directly.
- **Free Tier:** None.
- **Paid Pricing:**
  - DALL-E 3: $0.04 (standard 1024×1024), $0.08 (HD), $0.12 (HD 1792×1024)
  - DALL-E 2: $0.016-0.02/image (cheaper but lower quality)
  - GPT Image 1 Mini: $0.005-0.052/image (most affordable new model)
  - GPT Image 1: $0.011-0.25/image
  - GPT Image 1.5: $0.034/image (via Together AI)
- **Quality:** ★★★★☆ — DALL-E 3 is excellent. GPT Image models are even better.
- **Latency:** 3-10 seconds depending on model and quality
- **Special Notes:**
  - GPT Image 1 Mini at $0.005/image is extremely affordable
  - For 5 free avatar generations per user: $0.025-0.25/user depending on model
  - Native OpenAI compatibility = zero integration work
  - DALL-E 3 is well-known and users trust it
  - GPT Image 1 Mini offers best price/quality ratio in OpenAI ecosystem
- **OpenAI Compatibility:** ✅ Perfect — reference implementation.

### 4. Stability AI

**What it is:** The company behind Stable Diffusion. Offers API access to their models.

- **API Format:** Proprietary REST API
- **Free Tier:** 25-200 free credits on signup (one-time, not recurring)
- **Paid Pricing:** $10 for 1,000 credits. Cost per image varies by model and settings (1-30 credits).
- **Models:** Stable Image Core, SDXL, SD 3.5, Stable Image Ultra
- **Quality:** ★★★★☆ — Stable Image Ultra is very high quality. SDXL is solid.
- **Latency:** 2-5 seconds
- **Special Notes:**
  - Free credits are one-time — not sustainable for ongoing use
  - Open source models (SD) can be self-hosted for free
  - API pricing is reasonable but not the cheapest
  - Good quality but no ongoing free tier makes it less attractive
- **OpenAI Compatibility:** ❌ Proprietary REST API.

### 5. Hugging Face Inference API

**What it is:** Serverless inference for thousands of open-source models including image generation.

- **API Format:** REST API (Hugging Face format)
- **Free Tier:** Very limited. Free users get ~1 request/hour unregistered, ~300 requests/day registered. Recently reduced to token-based ($0.10 worth). Pro plan ($9/mo) for more.
- **Paid Pricing:** Pay-as-you-go with Pro plan. Varies by model.
- **Models:** Thousands of image models — SDXL, FLUX, Dreamshaper, custom LoRAs
- **Quality:** ★★★☆☆ — Varies by model. Can be excellent with right model.
- **Latency:** 5-15 seconds (cold starts are slow)
- **Special Notes:**
  - Free tier is too limited for production use
  - Cold starts make it unsuitable for onboarding (users won't wait)
  - Great for experimentation and prototyping
  - Can self-host the same models for free
- **OpenAI Compatibility:** ❌ Hugging Face API format.

### 6. Together AI

**What it is:** AI inference platform with 200+ models including excellent image generation.

- **API Format:** REST API (not OpenAI-compatible, but well-documented)
- **Free Tier:** Free credits on signup ($1-5 typically). FLUX.1 [schnell] was offered free for 3 months.
- **Paid Pricing (Image Models):**
  - FLUX.1 [schnell]: $0.0027/megapixel (~$0.003 for 1024×1024) — fastest & cheapest
  - FLUX.2 [dev]: $0.0154/image — great quality
  - FLUX.2 [pro]: $0.03/image — premium quality
  - SD XL: $0.0019/megapixel — budget option
  - Stable Diffusion 3: $0.0019/megapixel
  - Juggernaut Lightning Flux: $0.0017/megapixel — cheapest quality option
  - Google Imagen 4 Fast: $0.02/megapixel — Google quality
  - Dreamshaper: $0.0006/megapixel — cheapest overall
- **Quality:** ★★★★☆-★★★★★ depending on model. FLUX.2 dev is excellent.
- **Latency:** 1-5 seconds. FLUX schnell is extremely fast.
- **Special Notes:**
  - Best selection of image models in one API
  - FLUX.1 schnell is incredibly cheap and fast — perfect for avatar generation
  - Free credits let you test extensively before paying
  - Can access Google Imagen 4 models through Together (better than direct Vertex API pricing)
  - Dreamshaper at $0.0006/mp is basically free for avatar use
  - API is well-documented with good SDK support
- **OpenAI Compatibility:** ❌ Together AI REST API. Needs adapter but well-supported.

### 7. fal.ai

**What it is:** Fast inference platform for generative AI models.

- **API Format:** REST API
- **Free Tier:** Limited free tier available
- **Paid Pricing:** FLUX dev: $0.025/image, FLUX schnell: ~$0.003/image
- **Quality:** ★★★★☆ — Same models as Together AI (FLUX, etc.)
- **Latency:** 1-3 seconds. Very fast inference.
- **Special Notes:**
  - Focuses on speed — fastest inference for many models
  - Similar pricing to Together AI
  - Good developer experience
- **OpenAI Compatibility:** ❌ fal.ai REST API.

---

## Recommendations

### TTS Strategy (for Conflux Home onboarding)

**Primary: OpenAI tts-1 + gpt-4o-mini-tts**
- Native OpenAI compatibility — zero adapter work
- tts-1 at $0.015/1K chars: 5 clips × 50 chars = $0.00375/user
- gpt-4o-mini-tts for premium voices with natural instructions
- At 1,000 users/month: $3.75 for tts-1, ~$12 for mini-tts
- Best balance of quality, compatibility, and cost

**Free Alternative: Google Gemini TTS**
- Free tier via AI Studio covers onboarding use case
- Need to build adapter, but Gemini SDK is simple
- Quality is excellent and getting better
- Risk: rate limits could cause failures during onboarding spike

**Fallback: Browser SpeechSynthesis**
- Zero cost, zero dependency
- Use when API calls fail or user is offline
- Quality is poor but ensures onboarding always works

### Image Generation Strategy (for Conflux Home avatars)

**Primary: Together AI FLUX.1 [schnell]**
- $0.003/image — 5 free avatars = $0.015/user
- At 1,000 users: $15/month for avatar generation
- Fast (1-3s) and good quality
- Need adapter but Together AI has good SDKs

**Free Alternative: Cloudflare Workers AI**
- 10K free neurons/day = ~25-50 free images daily
- Perfect for launch when user volume is low
- Can wrap in Cloudflare Worker to match our API format
- SDXL quality is acceptable for stylized avatars

**Premium Option: OpenAI GPT Image 1 Mini**
- $0.005-0.052/image with native OpenAI compatibility
- Best quality for the price in OpenAI ecosystem
- Zero adapter work — direct integration
- Use this if we want to offer "premium avatar generation"

### Recommended Architecture

```
Conflux Home Router
├── TTS
│   ├── Primary: OpenAI tts-1 (native compat, $0.015/1K chars)
│   ├── Premium: OpenAI gpt-4o-mini-tts ($12/M tokens, custom voice)
│   └── Fallback: Browser SpeechSynthesis (free, client-side)
│
├── Image Generation
│   ├── Primary: Together AI FLUX.1 schnell ($0.003/image)
│   ├── Free Tier: Cloudflare Workers AI (10K neurons/day free)
│   └── Premium: OpenAI GPT Image 1 Mini ($0.005-0.052/image)
│
└── Adapter Layer
    ├── OpenAI-compatible router for TTS/image
    ├── Thin adapters for Together AI & Cloudflare
    └── Fallback chain: Primary → Free → Fallback
```

### Cost Projection (1,000 users/month, 5 TTS clips + 5 avatar gens each)

| Component | Strategy | Monthly Cost |
|-----------|----------|-------------|
| TTS (5 clips × 50 chars) | OpenAI tts-1 | $3.75 |
| Avatars (5 gens × 1024px) | Together AI FLUX schnell | $15.00 |
| **Total** | | **$18.75/month** |
| Cost per user | | **$0.019** |

With free tiers (early launch, <50 users/day):
| Component | Strategy | Monthly Cost |
|-----------|----------|-------------|
| TTS | Google Gemini free tier | $0 |
| Avatars | Cloudflare Workers AI free tier | $0 |
| **Total** | | **$0/month** |

---

## OpenAI Compatibility Notes

Our router uses OpenAI-compatible format. Here's what needs adapters:

| Provider | Adapter Complexity | Notes |
|----------|-------------------|-------|
| OpenAI TTS | None (native) | Direct use |
| OpenAI Images | None (native) | Direct use |
| Google Gemini | Medium | Gemini SDK → OpenAI format wrapper |
| ElevenLabs | Medium | REST wrapper for streaming audio |
| Cloudflare Workers AI | Medium | Cloudflare Worker as proxy |
| Together AI | Low-Medium | REST wrapper, well-documented API |
| Fish Audio | Medium | REST wrapper |

The adapter layer is a one-time build cost. For MVP, use OpenAI native for both TTS and images (zero adapter work), then add cheaper providers later.

---

*Report by Helix — Market Research & Intelligence*
*Research date: 2026-03-23*
