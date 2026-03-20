#!/bin/bash
set -e

source ~/.nvm/nvm.sh
nvm use 22

NODE_PATH="/home/calo/.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/openclaw.mjs"

# Array of steps: name|agent|minute|timeout|message
steps=(
  "Helix Daily Discovery|Helix|0|300|You are Helix. Read and follow /home/calo/.openclaw/shared/studio/helix_discovery_prompt.md. Search for digital product opportunities AND verify audio briefs are ready."
  "Vector Approval|Vector|3|120|You are Vector. Read and follow /home/calo/.openclaw/shared/studio/vector_approval_prompt.md. Review scored opportunities and approve or reject based on scoring thresholds."
  "Prism Mission Creation|Prism|7|120|You are Prism. Read and follow /home/calo/.openclaw/shared/studio/prism_mission_prompt.md. Create mission records from approved opportunities."
  "ZigBot Check 1|ZigBot|10|120|You are ZigBot. Report health to #mission-control."
  "Spectra Task Decomposition|Spectra|13|120|You are Spectra. Read and follow /home/calo/.openclaw/shared/studio/spectra_decompose_prompt.md. Decompose planning missions into task graphs."
  "Forge Build|Forge|17|900|You are Forge. Read and follow /home/calo/.openclaw/shared/studio/forge_build_prompt.md. Build artifacts for queued prompt pack missions. Generate 100 prompts, PDF content, and listing copy. Commit and push to Git when done."
  "Quanta QA Verification|Quanta|37|300|You are Quanta. Read and follow /home/calo/.openclaw/shared/studio/quanta_verify_prompt.md. Run QA checks on products pending verification against the product spec."
  "Forge Retry|Forge|41|900|You are Forge. Read and follow /home/calo/.openclaw/shared/studio/forge_build_prompt.md. This is a retry run. Pick up any products with status \"building\" (failed QA) and fix issues. Also complete pass 2 (prompts 51-100) for any product with only 50 prompts. Commit and push to Git when done."
  "ZigBot Check 2|ZigBot|45|120|You are ZigBot. Block Pulse if failed."
  "Pulse Launch|Pulse|49|300|You are Pulse. Read and follow /home/calo/.openclaw/shared/studio/pulse_launch_prompt.md. Prepare launch assets, schedule distribution."
)

for hour in 5 6 7; do
  for step in "${steps[@]}"; do
    IFS='|' read -r name agent minute timeout message <<< "$step"
    cron_expr="$minute $hour * * *"
    job_name="$name ($hour:$minute)"
    echo "Creating $job_name for $agent at $cron_expr"
    node "$NODE_PATH" cron add \
      --name "$job_name" \
      --agent "$agent" \
      --model openrouter/xiaomi/mimo-v2-flash \
      --message "$message" \
      --cron "$cron_expr" \
      --to 'channel:1479285742915031080' \
      --timeout-seconds "$timeout" \
      --best-effort-deliver \
      --announce
    echo "---"
  done
done