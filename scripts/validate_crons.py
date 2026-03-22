#!/usr/bin/env python3
"""
Cron Validator — Checks for common cron misconfigurations.
Run periodically or after adding new crons.

Checks:
1. Missing timezone (defaults to UTC, usually wrong)
2. Overlapping jobs targeting same agent at same time
3. Jobs without delivery config
"""

import json
import sys
from collections import defaultdict

CRON_PATH = "/home/calo/.openclaw/cron/jobs.json"
REQUIRED_TZ = "America/Denver"

def main():
    with open(CRON_PATH, 'r') as f:
        data = json.load(f)

    jobs = data.get("jobs", [])
    issues = []
    warnings = []

    # Track agent schedules for overlap detection
    agent_schedules = defaultdict(list)

    for job in jobs:
        name = job.get("name", "unknown")
        agent = job.get("agentId", "unknown")
        enabled = job.get("enabled", True)
        sched = job.get("schedule", {})
        delivery = job.get("delivery", {})

        if not enabled:
            continue

        # Check 1: Missing timezone
        if sched.get("kind") == "cron":
            tz = sched.get("tz", "")
            if not tz:
                issues.append(f"❌ MISSING TZ: [{agent}] {name}")
            elif tz != REQUIRED_TZ:
                warnings.append(f"⚠️  UNUSUAL TZ ({tz}): [{agent}] {name}")

            expr = sched.get("expr", "")
            agent_schedules[agent].append((expr, name))

        # Check 2: No delivery config
        if not delivery:
            warnings.append(f"⚠️  NO DELIVERY: [{agent}] {name}")

    # Check 3: Same agent, same cron expression
    for agent, schedules in agent_schedules.items():
        exprs = defaultdict(list)
        for expr, name in schedules:
            exprs[expr].append(name)
        for expr, names in exprs.items():
            if len(names) > 1:
                issues.append(f"❌ DUPLICATE SCHEDULE ({expr}): {', '.join(names)}")

    # Report
    print(f"🔍 Cron Validator — {len(jobs)} jobs checked\n")

    if issues:
        print("ISSUES (fix these):")
        for issue in issues:
            print(f"  {issue}")
        print()

    if warnings:
        print("WARNINGS:")
        for warn in warnings:
            print(f"  {warn}")
        print()

    if not issues and not warnings:
        print("✅ All crons look good!")

    # Full schedule dump
    print("\n📅 Current Schedule:")
    for job in sorted(jobs, key=lambda j: j.get("schedule", {}).get("expr", "")):
        name = job.get("name", "?")
        agent = job.get("agentId", "?")
        sched = job.get("schedule", {})
        expr = sched.get("expr", "?")
        tz = sched.get("tz", "NO TZ!")
        enabled = "✅" if job.get("enabled", True) else "❌"
        print(f"  {enabled} [{agent:10s}] {name:45s} {expr:15s} tz={tz}")

    return 1 if issues else 0

if __name__ == "__main__":
    sys.exit(main())
