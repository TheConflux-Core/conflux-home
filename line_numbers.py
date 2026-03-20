with open('/home/calo/.openclaw/apps/mission-control/components/schedules/schedule-board.tsx', 'r') as f:
    lines = f.readlines()
    for i, line in enumerate(lines[89:245], start=90):
        print(f"{i:3}: {line}", end='')  # keep newline as is