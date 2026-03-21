#!/usr/bin/env python3
"""Check Vercel deployment budget across all projects."""
import json, urllib.request, time, subprocess, sys

def get_token():
    result = subprocess.run(
        ["python3", "-c", "import json,sys; print(list(json.load(open('/home/calo/.local/share/com.vercel.cli/auth.json')).values())[0])"],
        capture_output=True, text=True
    )
    return result.stdout.strip()

def check_deployments():
    TOKEN = get_token()
    TEAM_ID = "team_GucOF34TTgfJnsD7e1BReZn2"
    PROJECTS = {
        "prj_JTinr5R2bzusuwt4yvsUPgq53EN4": "lead-followup-app",
        "prj_kIYnWR1Vn98a2DSXraQpDxaa8zZC": "theconflux",
        "prj_Z5ce43qEFn8B3HL5gYhw8BMGYqKY": "audiorecordingschool",
        "prj_x6MPiOXkcySzBgLtFAS09G4LG7fo": "clickhereforcandy"
    }

    cutoff = (time.time() - 86400) * 1000
    total = 0
    results = []

    for pid, name in PROJECTS.items():
        url = f"https://api.vercel.com/v6/deployments?projectId={pid}&limit=100"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        count = sum(1 for d in data.get("deployments", []) if d.get("createdAt", 0) > cutoff)
        total += count
        results.append((name, count))

    remaining = 100 - total
    status = "🟢 OK" if remaining > 20 else "🟡 LOW" if remaining > 5 else "🔴 CRITICAL"

    print(f"\n{'='*45}")
    print(f"  VERCEL DEPLOYMENT BUDGET — {status}")
    print(f"{'='*45}")
    for name, count in results:
        bar = "█" * count + "░" * (100 - count)
        print(f"  {name:25s} {count:3d}")
    print(f"{'─'*45}")
    print(f"  {'TOTAL':25s} {total:3d}/100")
    print(f"  {'REMAINING':25s} {remaining:3d}")
    print(f"{'='*45}")

    if remaining < 10:
        print(f"\n  ⚠️  WARNING: Only {remaining} deploys left. DO NOT push to GitHub.")
        print(f"  Window resets ~24h after first deploy in current period.")
        sys.exit(1)
    elif remaining < 30:
        print(f"\n  ⚠️  Caution: {remaining} deploys remaining. Batch your commits.")
        sys.exit(0)
    else:
        print(f"\n  ✅ {remaining} deploys available. Safe to build.")
        sys.exit(0)

if __name__ == "__main__":
    check_deployments()
