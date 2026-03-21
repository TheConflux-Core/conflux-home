import json
import re
import datetime

# Product and URLs
product_id = "product-0301"
gumroad_url = "https://theconflux.gumroad.com/l/100_ai_prompts_healthcare_administrators"

# Channel IDs from buffer config
linkedin_channel_id = "69afa56e7be9f8b1713dd969"
x_channel_id = "69afa4607be9f8b1713dd5fe"

# Read social-linkedin.md and extract posts
linkedin_path = f'/home/calo/.openclaw/shared/products/{product_id}/marketing/social-linkedin.md'
x_path = f'/home/calo/.openclaw/shared/products/{product_id}/marketing/social-x.md'

def parse_linkedin_posts(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    # Split by "## Post"
    posts = re.split(r'\n## Post \d+:', content)
    # The first part is header, discard
    posts = posts[1:]
    # Each post is everything before next "## Post" or end
    # Actually we can split by "---" lines
    post_sections = content.split('---')
    # Filter out non-post sections
    posts = []
    current = []
    for line in content.split('\n'):
        if line.startswith('## Post'):
            if current:
                posts.append('\n'.join(current))
                current = []
        current.append(line)
    if current:
        posts.append('\n'.join(current))
    # Remove first element (header)
    posts = posts[1:]
    # Clean up: remove leading/trailing whitespace
    posts = [p.strip() for p in posts if p.strip()]
    return posts

def parse_x_posts(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    posts = []
    current = []
    for line in lines:
        if line.startswith('## Post'):
            if current:
                posts.append(''.join(current).strip())
                current = []
        current.append(line)
    if current:
        posts.append(''.join(current).strip())
    # Remove first element (header)
    if posts:
        posts = posts[1:]
    return posts

linkedin_posts = parse_linkedin_posts(linkedin_path)
print(f'Found {len(linkedin_posts)} LinkedIn posts')
x_posts = parse_x_posts(x_path)
print(f'Found {len(x_posts)} X posts')

# Now create buffer entries
queue_file = '/home/calo/.openclaw/shared/marketing/buffer_publish_queue.jsonl'

with open(queue_file, 'a') as f:
    # LinkedIn posts (5)
    for i, post in enumerate(linkedin_posts[:5], 1):
        # Extract post text (remove the "## Post X: Title" line)
        lines = post.split('\n')
        # Find the line that starts with '## Post'
        for idx, line in enumerate(lines):
            if line.startswith('## Post'):
                lines = lines[idx+1:]
                break
        post_text = '\n'.join(lines).strip()
        entry = {
            "product": product_id,
            "platform": "linkedin",
            "text": post_text,
            "url": gumroad_url,
            "status": "PENDING",
            "channel_id": linkedin_channel_id
        }
        f.write(json.dumps(entry) + '\n')
    # X posts (10)
    for i, post in enumerate(x_posts[:10], 1):
        lines = post.split('\n')
        # Remove the "## Post X" line
        for idx, line in enumerate(lines):
            if line.startswith('## Post'):
                lines = lines[idx+1:]
                break
        post_text = '\n'.join(lines).strip()
        # Replace placeholder URL
        post_text = post_text.replace('{gumroad_url}', gumroad_url)
        entry = {
            "product": product_id,
            "platform": "x",
            "text": post_text,
            "url": gumroad_url,
            "status": "PENDING",
            "channel_id": x_channel_id
        }
        f.write(json.dumps(entry) + '\n')

print('Added social posts to buffer queue')