import json

with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)

display_names = {
    'helix': 'Helix',
    'vector': 'Vector',
    'prism': 'Prism',
    'zigbot': 'ZigBot',
    'spectra': 'Spectra',
    'forge': 'Forge',
    'quanta': 'Quanta',
    'pulse': 'Pulse'
}

for job in data['jobs']:
    agent_id = job.get('agentId')
    if agent_id:
        # Add root-level 'agent' field
        job['agent'] = agent_id
        # Add payload fields
        if 'payload' in job and isinstance(job['payload'], dict):
            job['payload']['agentId'] = agent_id
            job['payload']['displayName'] = display_names.get(agent_id, agent_id.capitalize())

# Write back
with open('/home/calo/.openclaw/cron/jobs.json', 'w') as f:
    json.dump(data, f, indent=2)
    
print(f"Updated {len(data['jobs'])} jobs")