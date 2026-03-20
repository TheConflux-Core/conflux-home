import json
with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)
    for job in data['jobs'][:3]:
        print(f"{job['name']}: agent={job.get('agent')}, displayName={job.get('payload', {}).get('displayName')}")