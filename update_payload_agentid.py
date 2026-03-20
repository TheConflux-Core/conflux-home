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
        # Update payload.agentId
        if 'payload' in job and isinstance(job['payload'], dict):
            job['payload']['agentId'] = agent_map[agent_id]
        # Update root agentId? keep lowercase? The root agentId is used as internal ID? Let's keep as is (lowercase) because it might be used elsewhere.
        # But we can also update root agentId to capitalized? Let's see the backup: root agentId was "helix"? Not sure.
        # Let's keep root agentId as lowercase (original).
        pass

# Write back
with open('/home/calo/.openclaw/cron/jobs.json', 'w') as f:
    json.dump(data, f, indent=2)
    
print("Updated payload.agentId to capitalized")