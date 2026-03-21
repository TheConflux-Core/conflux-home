#!/usr/bin/env python3
import json
import os

# Read product spec to know format
spec_path = '/home/calo/.openclaw/shared/products/PRODUCT_SPEC_PROMPT_PACKS.md'
with open(spec_path, 'r') as f:
    spec = f.read()

# Write prompts.md
output_path = '/home/calo/.openclaw/shared/products/product-0301/source/prompts.md'
with open(output_path, 'w') as f:
    f.write('# 100 AI Prompts for Healthcare Practice Administrators\n\n')
    f.write('A Professional AI Toolkit for Healthcare Practice Administrators\n\n')
    f.write('Save hours every week using AI to automate administrative tasks, patient communication, compliance, and operations.\n\n')
    f.write('## Table of Contents\n')
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
    for i, cat in enumerate(categories, 1):
        f.write(f'{i}. {cat}\n')
    f.write('\n## How to Use This Toolkit\n')
    f.write('Every prompt includes variables you can customize. Replace the {brackets} with your information.\n\n')
    f.write('**Example:**\n')
    f.write('- Patient Name: {patient_name} → Patient Name: Jane Doe\n')
    f.write('- Appointment Date: {appointment_date} → Appointment Date: 2026-03-21\n')
    f.write('- Insurance Provider: {insurance_provider} → Insurance Provider: BlueCross\n\n')
    f.write('Paste the completed prompt into ChatGPT, Claude, Gemini, or any modern AI assistant.\n\n')
    f.write('**Compatible With:** ChatGPT • Claude • Gemini • Any modern AI assistant\n\n')
    f.write('## Prompts\n\n')
    # Generate 100 prompts (placeholder)
    for i in range(1, 101):
        cat_idx = ((i - 1) // 10) + 1
        cat = categories[cat_idx - 1]
        f.write(f'### Prompt {i}: {cat}\n\n')
        f.write(f'**Role:** Healthcare Practice Administrator\n\n')
        f.write(f'**Task:** Generate a {cat.lower()} related message.\n\n')
        f.write(f'**Inputs:**\n')
        f.write(f'- Patient Name: {{patient_name}}\n')
        f.write(f'- Date: {{date}}\n')
        f.write(f'- Details: {{details}}\n\n')
        f.write(f'**Requirements:**\n')
        f.write(f'- Be professional and concise.\n')
        f.write(f'- Include all necessary information.\n')
        f.write(f'- Format as a clear message.\n\n')
        f.write(f'**Output:**\n')
        f.write(f'- A formatted message ready for sending.\n\n')
        f.write('---\n\n')

print(f'Generated {output_path}')