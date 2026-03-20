with open('/home/calo/.openclaw/apps/mission-control/components/schedules/schedules-page-view.tsx', 'r') as f:
    lines = f.readlines()
    for i in range(226, 250):
        print(f"{i+1:3}: {lines[i]}", end='')  # i+1 because line numbers start at 1