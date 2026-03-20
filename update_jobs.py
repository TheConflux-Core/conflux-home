import json

with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)

for job in data['jobs']:
    # Add root-level 'agent' field (same as agentId)
    if 'agentId' in job:
        job['agent'] = job['agentId']
    # Add payload fields
    if 'payload' in job and isinstance(job['payload'], dict):
        # Add agentId to payload (copy from root)
        if 'agentId' in job:
            job['payload']['agentId'] = job['agentId']
        # Add displayName (capitalize first letter)
        if 'agentId' in job:
            job['payload']['displayName'] = job['agentId'].capitalize()

# Write back
with open('/home/calo/.openclaw/cron/jobs.json', 'w') as f:
    json.dump(data, f, indent=2)
    
print(f"Updated {len(data['jobs'])} jobs")