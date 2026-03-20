const { execSync } = require('child_process');
const cmd = 'node /home/calo/.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/openclaw.mjs cron list --json';
try {
  const output = execSync(cmd, { encoding: 'utf8' });
  const data = JSON.parse(output);
  const jobs = data.jobs || [];
  console.log(`Total jobs: ${jobs.length}`);
  jobs.forEach(j => {
    console.log(`${j.id} | ${j.name} | ${j.schedule.expr} | ${j.agentId}`);
  });
} catch (e) {
  console.error(e.message);
}