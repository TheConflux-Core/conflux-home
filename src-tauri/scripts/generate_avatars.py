#!/usr/bin/env python3
"""
Conflux Home — Agent Avatar Generator
Uses OpenAI DALL-E 3 to generate agent character avatars.

Usage:
  OPENAI_API_KEY="sk-..." python3 generate_avatars.py [--agent zigbot] [--all]

Without --agent flag, generates all 10 agents.
Images saved to public/avatars/{agent-id}.png
"""

import os
import sys
import json
import base64
import urllib.request
import urllib.error
import time

API_KEY = os.environ.get("OPENAI_API_KEY", "")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "public", "avatars")

AGENT_PROMPTS = {
    "zigbot": (
        "A sleek, futuristic humanoid AI assistant avatar. "
        "Sharp angular features, subtle blue holographic glow around the silhouette. "
        "Confident posture, wearing a minimalist dark suit with glowing circuit-line accents. "
        "Clean vector style, dark gradient background, 512x512, no text."
    ),
    "helix": (
        "A thoughtful scientist avatar, modern and clean. "
        "Wearing a lab coat over casual clothes, holding a holographic data sphere. "
        "Warm lighting, subtle green and teal accents. "
        "Intelligent expression, modern vector illustration style, dark background, 512x512, no text."
    ),
    "forge": (
        "A strong, determined creator avatar. "
        "Wearing a modern workshop apron with tool belt, hands mid-creation assembling something glowing. "
        "Warm amber lighting, sparks of energy. "
        "Modern vector style, dark background, 512x512, no text."
    ),
    "quanta": (
        "A precise, detail-oriented inspector avatar. "
        "Clean and organized appearance, holding a glowing clipboard/checklist. "
        "Crisp white and silver accents. Sharp, focused expression. "
        "Modern vector style, dark background, 512x512, no text."
    ),
    "prism": (
        "A crystalline geometric humanoid avatar. "
        "Translucent prismatic body refracting light into rainbow spectrums. "
        "Calm, centered pose. Elegant and otherworldly. "
        "Modern vector style, dark background, 512x512, no text."
    ),
    "pulse": (
        "An energetic, vibrant avatar radiating dynamic energy. "
        "Bright colors — electric violet and hot pink. "
        "Confident smile, one hand raised with a pulsing signal wave. "
        "Modern vector style, dark background, 512x512, no text."
    ),
    "vector": (
        "A sharp, commanding business leader avatar. "
        "Perfectly tailored dark suit, confident stance, arms crossed. "
        "Subtle orange/gold accents suggesting precision and authority. "
        "Modern vector style, dark background, 512x512, no text."
    ),
    "spectra": (
        "A fractal-like analytical avatar. "
        "Body made of geometric fragments that can separate and recombine. "
        "Multiple floating data shards orbiting. Cool blue and indigo tones. "
        "Modern vector style, dark background, 512x512, no text."
    ),
    "luma": (
        "A rocket-energy avatar, dynamic forward motion. "
        "Body trailing energy streaks, bright cyan and white. "
        "One fist forward, launching into action. Energetic, optimistic expression. "
        "Modern vector style, dark background, 512x512, no text."
    ),
    "catalyst": (
        "A lightning-infused accelerator avatar. "
        "Electric yellow-white energy crackling around the form, leaning forward as if mid-sprint. "
        "Sharp, alert eyes. Dynamic pose suggesting constant motion. "
        "Modern vector style, dark background, 512x512, no text."
    ),
}


def generate_image(agent_id: str, prompt: str) -> str | None:
    """Call DALL-E 3 API, return base64 image data or None on failure."""
    payload = json.dumps({
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "quality": "standard",
        "response_format": "b64_json"
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            if "data" in data and len(data["data"]) > 0:
                return data["data"][0].get("b64_json")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ❌ HTTP {e.code}: {body}")
    except Exception as e:
        print(f"  ❌ Error: {e}")

    return None


def save_image(agent_id: str, b64_data: str) -> str:
    """Save base64 image to public/avatars/{agent_id}.png"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, f"{agent_id}.png")
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(b64_data))
    return filepath


def main():
    if not API_KEY:
        print("❌ Set OPENAI_API_KEY environment variable")
        sys.exit(1)

    # Parse args
    target_agent = None
    if "--agent" in sys.argv:
        idx = sys.argv.index("--agent")
        if idx + 1 < len(sys.argv):
            target_agent = sys.argv[idx + 1]

    if target_agent:
        if target_agent not in AGENT_PROMPTS:
            print(f"❌ Unknown agent: {target_agent}")
            print(f"   Available: {', '.join(AGENT_PROMPTS.keys())}")
            sys.exit(1)
        agents = {target_agent: AGENT_PROMPTS[target_agent]}
    else:
        agents = AGENT_PROMPTS

    print(f"🎨 Generating {len(agents)} agent avatar(s)...\n")

    for agent_id, prompt in agents.items():
        print(f"⏳ {agent_id}...", end=" ", flush=True)
        b64 = generate_image(agent_id, prompt)
        if b64:
            path = save_image(agent_id, b64)
            print(f"✅ → {path}")
        else:
            print("⏭️  skipped (check API key/billing)")
        # Rate limit: 1 request per 3 seconds
        if len(agents) > 1:
            time.sleep(3)

    print(f"\n✨ Done! Avatars in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
