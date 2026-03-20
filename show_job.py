import json
with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)
    job = data['jobs'][0]
    print(json.dumps(job, indent=2))