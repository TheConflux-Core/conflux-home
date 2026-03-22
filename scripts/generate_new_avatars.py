#!/usr/bin/env python3
"""Generate DALL-E 3 avatars for the 8 new marketplace agents."""

import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error

API_KEY = os.environ.get("OPENAI_API_KEY")
if not API_KEY:
    print("ERROR: OPENAI_API_KEY not set")
    sys.exit(1)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "avatars")
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMPTS = {
    "legal-expert": "A sharp, distinguished legal advisor avatar. Wearing a modern suit with subtle scales of justice motif. Confident expression. Clean vector style, dark background, 512x512, no text.",
    "chef": "A warm, creative chef avatar. Modern chef coat, holding a glowing whisk with energy particles. Warm kitchen lighting. Clean vector style, dark background, 512x512, no text.",
    "code-mentor": "A friendly coding teacher avatar. Casual hoodie, floating code snippets orbiting around. Cool blue-purple lighting. Clean vector style, dark background, 512x512, no text.",
    "finance": "A sharp financial advisor avatar. Clean professional look, holographic charts and graphs floating nearby. Green and gold accents. Clean vector style, dark background, 512x512, no text.",
    "storyteller": "A magical storyteller avatar. Flowing robes, book open with stories materializing as glowing illustrations. Warm amber magical lighting. Clean vector style, dark background, 512x512, no text.",
    "fitness": "An energetic fitness coach avatar. Athletic wear, dynamic pose mid-stretch. Bright green energy aura. Clean vector style, dark background, 512x512, no text.",
    "travel": "An adventurous travel guide avatar. Casual explorer outfit, holographic globe floating nearby. Warm sunset tones. Clean vector style, dark background, 512x512, no text.",
    "debate": "A sharp-witted debate partner avatar. Smart casual, leaning forward with confident smirk. Electric blue accents. Clean vector style, dark background, 512x512, no text.",
}


def generate_avatar(agent_id: str, prompt: str) -> bool:
    """Generate one avatar via DALL-E 3 b64_json response format."""
    url = "https://api.openai.com/v1/images/generations"
    payload = json.dumps({
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "response_format": "b64_json",
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  ✗ HTTP {e.code}: {body[:300]}")
        return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

    b64 = data.get("data", [{}])[0].get("b64_json")
    if not b64:
        print(f"  ✗ No b64_json in response")
        return False

    out_path = os.path.join(OUTPUT_DIR, f"{agent_id}.png")
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64))

    size_kb = os.path.getsize(out_path) / 1024
    print(f"  ✓ Saved {out_path} ({size_kb:.0f} KB)")
    return True


def main():
    agents = list(PROMPTS.items())
    print(f"Generating {len(agents)} avatars...\n")

    success = 0
    fail = 0
    for i, (agent_id, prompt) in enumerate(agents):
        print(f"[{i+1}/{len(agents)}] {agent_id}...")
        if generate_avatar(agent_id, prompt):
            success += 1
        else:
            fail += 1
        if i < len(agents) - 1:
            print("  Sleeping 3s...")
            time.sleep(3)

    print(f"\nDone: {success} succeeded, {fail} failed")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
