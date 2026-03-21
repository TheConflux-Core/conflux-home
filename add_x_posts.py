import json

product_id = "product-0301"
gumroad_url = "https://theconflux.gumroad.com/l/100_ai_prompts_healthcare_administrators"
x_channel_id = "69afa4607be9f8b1713dd5fe"

x_path = f'/home/calo/.openclaw/shared/products/{product_id}/marketing/social-x.md'

with open(x_path, 'r') as f:
    content = f.read()

# Split by "---"
parts = content.split('---')
# First part is header
posts = []
for part in parts[1:]:
    lines = part.strip().split('\n')
    # Remove the "## Post X" line
    filtered = []
    for line in lines:
        if line.startswith('## Post'):
            continue
        filtered.append(line)
    post_text = '\n'.join(filtered).strip()
    if post_text:
        posts.append(post_text)

print(f'Found {len(posts)} X posts')

queue_file = '/home/calo/.openclaw/shared/marketing/buffer_publish_queue.jsonl'

with open(queue_file, 'a') as f:
    for post in posts[:10]:
        # Replace placeholder
        post = post.replace('{gumroad_url}', gumroad_url)
        entry = {
            "product": product_id,
            "platform": "x",
            "text": post,
            "url": gumroad_url,
            "status": "PENDING",
            "channel_id": x_channel_id
        }
        f.write(json.dumps(entry) + '\n')

print('Added X posts to buffer queue')