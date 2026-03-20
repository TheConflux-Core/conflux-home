import json
with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)
    for job in data['jobs'][:5]:
        print(f"{job['name']}: relatedMission = {job.get('relatedMission')}")