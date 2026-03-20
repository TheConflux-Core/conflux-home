import json
with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)
    for job in data['jobs'][:3]:
        print(f"Job: {job['name']}")
        print(f"  agentId: {job.get('agentId')}")
        print(f"  payload keys: {list(job['payload'].keys())}")
        print()