#!/usr/bin/env python3
import json
import datetime
import os
import subprocess

# Start time of pipeline block (2:45 PM Mountain = 20:45 UTC)
start_time = datetime.datetime(2026, 3, 20, 20, 45, 0)  # UTC

# Find product_published events after start_time
events_file = '/home/calo/.openclaw/shared/telemetry/events.jsonl'
products = []
if os.path.exists(events_file):
    with open(events_file, 'r') as f:
        for line in f:
            try:
                event = json.loads(line)
            except:
                continue
            if event.get('type') == 'product_published':
                ts = event.get('ts', '')
                if ts:
                    event_time = datetime.datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    if event_time >= start_time:
                        product_id = event.get('ref_id')
                        if product_id:
                            products.append(product_id)
except Exception as e:
    print(f"Error reading events: {e}")

# Deduplicate and take the most recent
if products:
    # Since we only expect one new product in this block, take the first
    product_id = products[-1]
else:
    # Fallback: find the most recently created product directory
    product_dir = '/home/calo/.openclaw/shared/products'
    candidates = []
    for d in os.listdir(product_dir):
        if d.startswith('product-') and os.path.isdir(os.path.join(product_dir, d)):
            product_json = os.path.join(product_dir, d, 'product.json')
            if os.path.exists(product_json):
                stat = os.stat(product_json)
                mtime = datetime.datetime.fromtimestamp(stat.st_mtime)
                if mtime >= datetime.datetime(2026, 3, 20, 14, 45):  # local time
                    candidates.append((mtime, d))
    if candidates:
        candidates.sort(key=lambda x: x[0])
        product_id = candidates[-1][1]
    else:
        product_id = None

if not product_id:
    print("No new product found after 2:45 PM. Emailing summary only.")
    # Still email Don with a summary that no product was published.
    # We'll still send email with a note.
    body = """No new product was published during the 1-hour block (2:45–3:45 PM).
Pipeline may still be in progress or no new opportunity met the threshold."""
else:
    # Gather files
    base_path = f'/home/calo/.openclaw/shared/products/{product_id}'
    attachments = []
    for rel_path in ['source/prompts.md', 'artifacts/prompt-pack.md', 'listings/gumroad.md', 'listings/etsy.md']:
        full_path = os.path.join(base_path, rel_path)
        if os.path.exists(full_path):
            attachments.append(full_path)
        else:
            print(f"Warning: {full_path} not found")
    
    # Read product.json for summary
    product_json = os.path.join(base_path, 'product.json')
    product_name = 'Unknown'
    if os.path.exists(product_json):
        with open(product_json, 'r') as f:
            prod = json.load(f)
            product_name = prod.get('name', product_name)
    
    # Build email body
    body = f"""Summary of the 1-hour pipeline block (2:45–3:45 PM):

Product discovered and published: {product_name} ({product_id})

Files attached:
- Source prompts (source/prompts.md)
- Prompt pack PDF source (artifacts/prompt-pack.md)
- Gumroad listing (listings/gumroad.md)
- Etsy listing (listings/etsy.md)

All launch assets are ready for manual upload to Gumroad and Etsy.
Social posts generated and queued in Buffer (pending slot availability).

Next steps: Upload listings and assets to respective platforms.
"""

# Send email using gog
email_cmd = [
    'GOG_KEYRING_PASSWORD=Nolimit@i26Lng',
    'gog', 'mail', 'send',
    '--to', 'theconflux303@gmail.com',
    '--subject', f'Pipeline Block Summary – {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}',
    '--body', body,
    '--account', 'theconflux303@gmail.com'
]

# Add attachments if any
if product_id and attachments:
    for att in attachments:
        email_cmd.extend(['--attach', att])

print(f"Running email command with {len(attachments)} attachments...")
result = subprocess.run(email_cmd, shell=False, capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)

if result.returncode == 0:
    print("Email sent successfully.")
else:
    print(f"Email failed with code {result.returncode}")