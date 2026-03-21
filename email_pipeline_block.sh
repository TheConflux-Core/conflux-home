#!/bin/bash
set -e
cd /home/calo/.openclaw/workspace
python3 email_pipeline_summary.py 2>&1 | tee /tmp/email_pipeline_summary.log
echo "Pipeline email job completed."