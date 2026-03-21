with open('/home/calo/.openclaw/workspace/memory/2026-03-20.md', 'r') as f:
    content = f.read()

new_entry = """
### ZigBot: When you receive the message "Run email pipeline summary script for the 1-hour block"
Execute the shell script `/home/calo/.openclaw/workspace/email_pipeline_block.sh`.
This script will email Don with the product files and summary for the pipeline block that just completed.
"""

content += new_entry
with open('/home/calo/.openclaw/workspace/memory/2026-03-20.md', 'w') as f:
    f.write(content)

print('ZigBot instructions added.')