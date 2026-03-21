#!/usr/bin/env python3
import os

# Product details
product_name = "100 AI Prompts for Healthcare Practice Administrators"
audience = "Healthcare practice administrators, medical office managers, dental office managers, chiropractic administrators, physical therapy office managers, mental health practice administrators, multi-location healthcare operations managers"
categories = [
    'Patient Scheduling & Reminders',
    'Billing & Insurance Processing',
    'Compliance & HIPAA Documentation',
    'Staff Management & Scheduling',
    'Patient Communication & Follow-up',
    'Appointment Coordination',
    'Revenue Cycle Management',
    'Quality Assurance & Reporting',
    'Vendor & Supply Management',
    'Technology & EHR Support'
]

gumroad = f"""# {product_name}

A Professional AI Toolkit for {audience}

## Description

Stop spending hours on administrative tasks, patient communication, and compliance documentation from scratch. This toolkit gives you **100 production-grade AI prompts** designed specifically for healthcare practice administrators.

Each prompt is a mini-framework — not a generic template. Just fill in the variables, paste into ChatGPT, Claude, or any AI assistant, and get professional results in seconds.

### What's Inside:

• **100 production-grade prompts** across 10 categories
• {categories[0]} — Appointment reminders, scheduling conflicts, patient no-shows
• {categories[1]} — Insurance verification, claim follow-up, patient billing
• {categories[2]} — HIPAA compliance, documentation audits, privacy protocols
• {categories[3]} — Staff scheduling, time-off requests, performance reviews
• {categories[4]} — Patient follow-up, satisfaction surveys, feedback requests
• {categories[5]} — Coordination with providers, room assignments, resource allocation
• {categories[6]} — Revenue cycle optimization, collections, denial management
• {categories[7]} — Quality metrics, reporting, KPI tracking
• {categories[8]} — Supply ordering, vendor management, inventory control
• {categories[9]} — EHR troubleshooting, technology adoption, training

### How It Works:

1. Pick a prompt that matches your task
2. Fill in the {{variables}} with your details
3. Paste into ChatGPT, Claude, or any AI assistant
4. Get professional results in seconds

### Who Is This For:

Healthcare practice administrators, medical office managers, dental office managers, chiropractic administrators, physical therapy office managers, mental health practice administrators, multi-location healthcare operations managers.

### Pricing:

$29 (one-time purchase) — lifetime updates included.

### Format:

Instant download — PDF and Markdown formats included.

### Compatibility:

ChatGPT • Claude • Gemini • Any modern AI assistant

---

**Tags:** AI prompts, healthcare administration, medical office management, patient scheduling, billing, compliance, HIPAA, staff management, revenue cycle, quality assurance

**Categories:** Business & Finance, Productivity, Healthcare
"""

etsy = f"""# {product_name}

A Professional AI Toolkit for Healthcare Practice Administrators

## Overview

This digital download contains **100 carefully crafted AI prompts** to help healthcare practice administrators automate administrative tasks, improve patient communication, and maintain compliance.

## What You Get:

• **100 AI prompts** across 10 categories
• **PDF format** — easy to read and print
• **Markdown format** — copy and paste into your favorite AI assistant
• **Lifetime updates** — future prompts added at no extra cost

## Categories Included:

1. {categories[0]}
2. {categories[1]}
3. {categories[2]}
4. {categories[3]}
5. {categories[4]}
6. {categories[5]}
7. {categories[6]}
8. {categories[7]}
9. {categories[8]}
10. {categories[9]}

## How To Use:

Each prompt includes variables like {{patient_name}}, {{date}}, {{details}}. Fill them in with your specific information, then paste the completed prompt into ChatGPT, Claude, Gemini, or any AI assistant.

## Ideal For:

• Medical office managers
• Dental practice administrators
• Chiropractic clinic coordinators
• Physical therapy office managers
• Mental health practice administrators
• Multi‑location healthcare operations managers

## Why This Toolkit?

Healthcare administration is time‑consuming. These prompts are designed by someone who understands the daily challenges of running a healthcare practice. Save hours every week.

## Instant Download:

After purchase, you'll receive a PDF file with all 100 prompts and a Markdown file for easy copying.

## Price:

$29.99

---

**Tags:** AI prompts, healthcare, administration, medical office, dental, chiropractic, physical therapy, mental health, patient scheduling, billing, compliance, staff management

**Category:** Business & Services / Medical & Health Care
"""

# Write files
output_dir = '/home/calo/.openclaw/shared/products/product-0301/listings'
os.makedirs(output_dir, exist_ok=True)

with open(os.path.join(output_dir, 'gumroad.md'), 'w') as f:
    f.write(gumroad)

with open(os.path.join(output_dir, 'etsy.md'), 'w') as f:
    f.write(etsy)

print('Generated listings')