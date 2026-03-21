with open('/home/calo/.openclaw/workspace/memory/2026-03-20.md', 'r') as f:
    content = f.read()

new_entry = """
### Cron Job: Email Pipeline Block Summary
- **Cron ID:** `44118b59-a827-40bc-a4b3-3b27665718db`
- **Runs at:** 3:45 PM (21:45 UTC)
- **Agent:** ZigBot
- **Message:** "Run email pipeline summary script for the 1-hour block"
- **Action:** When ZigBot receives this message, it should execute `/home/calo/.openclaw/workspace/email_pipeline_block.sh`.
  The script will:
  1. Find the product published during the 2:45–3:45 PM pipeline block.
  2. Email Don with that product's files (prompts.md, prompt-pack.md, gumroad.md, etsy.md) and a summary.
  3. If no new product, email a summary note.
"""

content += new_entry
with open('/home/calo/.openclaw/workspace/memory/2026-03-20.md', 'w') as f:
    f.write(content)

print('Cron instructions added to memory.')