import sys
with open('/home/calo/.openclaw/apps/mission-control/components/schedules/schedule-board.tsx', 'r') as f:
    lines = f.readlines()
    # lines 90-235 are 1-indexed, convert to 0-indexed
    old_text = ''.join(lines[89:235])  # 89 inclusive, 235 exclusive
    sys.stdout.write(old_text)