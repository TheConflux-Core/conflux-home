import sys
with open('/home/calo/.openclaw/apps/mission-control/components/schedules/schedule-board.tsx', 'r') as f:
    lines = f.readlines()
    for i, line in enumerate(lines[89:100], start=90):
        spaces = len(line) - len(line.lstrip(' '))
        print(f"{i:3}: {spaces:2} spaces | {line.rstrip()}")