import json
with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)
    for job in data['jobs'][:3]:
        print(f"{job['name']}: payload.agentId={job.get('payload', {}).get('agentId')}, root.agentId={job.get('agentId')}")