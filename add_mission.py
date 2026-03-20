import json
import re

with open('/home/calo/.openclaw/cron/jobs.json', 'r') as f:
    data = json.load(f)

for job in data['jobs']:
    cron = job.get('schedule', {}).get('expr', '')
    # parse hour (first field is minute, second is hour)
    parts = cron.split()
    if len(parts) >= 2:
        hour = parts[1]
        minute = parts[0]
    else:
        hour = '?'
        minute = '?'
    
    name = job.get('name', '')
    # Determine block
    related_mission = None
    if 'Morning Huddle' in name:
        related_mission = 'Daily Huddle'
    elif 'Block 1 Debrief' in name:
        related_mission = 'Block 1 Debrief'
    elif 'Block 2 Debrief' in name:
        related_mission = 'Block 2 Debrief'
    elif 'Block 3 Debrief' in name:
        related_mission = 'Block 3 Debrief'
    elif 'Block 2 Ready' in name:
        related_mission = 'Block 2 Ready'
    elif 'Block 3 Ready' in name:
        related_mission = 'Block 3 Ready'
    elif hour == '5':
        related_mission = 'Block 1'
    elif hour == '6':
        related_mission = 'Block 2'
    elif hour == '7':
        related_mission = 'Block 3'
    else:
        related_mission = 'Other'
    
    job['relatedMission'] = related_mission
    # Also add a block identifier maybe
    job['block'] = related_mission

# Write back
with open('/home/calo/.openclaw/cron/jobs.json', 'w') as f:
    json.dump(data, f, indent=2)
    
print(f"Updated {len(data['jobs'])} jobs with relatedMission")