import json

with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)

agent_map = {
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
    if agent_id and agent_id in agent_map:
        job['agent'] = agent_map[agent_id]
        if 'payload' in job and isinstance(job['payload'], dict):
            job['payload']['displayName'] = agent_map[agent_id]

# Write back
with open('/home/calo/.openclaw/cron/jobs.json', 'w') as f:
    json.dump(data, f, indent=2)
    
print("Capitalized agent names")