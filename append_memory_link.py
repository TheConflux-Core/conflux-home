with open('/home/calo/.openclaw/workspace/memory/2026-03-20.md', 'r') as f:
    content = f.read()

new_entry = """
### Gumroad Link for Financial Advisors Prompt Pack
- **Product:** product-0101 — AI Prompt Pack for Financial Advisors
- **Gumroad URL:** https://theconflux.gumroad.com/l/100_ai_prompts_for_financial_advisors
- **Price:** $29
- **Status:** Published (2026-03-20)
"""

# Append before the final "Next Steps" section (or just at end)
content += new_entry

with open('/home/calo/.openclaw/workspace/memory/2026-03-20.md', 'w') as f:
    f.write(content)

print('Memory updated with Gumroad link.')