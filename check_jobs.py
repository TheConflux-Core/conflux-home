import json,sys
d=json.load(sys.stdin)
for j in d['jobs']:
    print(f"Job: {j['name']} | status={j['status']} conclusion={j.get('conclusion','?')}")
    if j.get('conclusion') == 'failure':
        print(f"  failure_reason: {j.get('failure_reason','unknown')}")
        print(f"  started_at: {j.get('started_at','n/a')}")
        print(f"  completed_at: {j.get('completed_at','n/a')}")
        for step in j.get('steps',[]):
            if step.get('conclusion') == 'failure':
                print(f"  FAILED STEP: {step['name']} #{step['number']}")
                print(f"  exitCode: {step.get('exitCode','n/a')}")