const { spawnSync } = require('child_process');
const fs = require('fs');
const OUT = 'c:\\Users\\gt\\kiro\\blockchain\\git_init_out.txt';
fs.writeFileSync(OUT, '');

function log(msg) { const l = `${msg}\n`; process.stdout.write(l); fs.appendFileSync(OUT, l); }
function run(cmd, cwd) {
  log(`\n>>> ${cmd}`);
  const r = spawnSync(cmd, { shell: true, cwd: cwd || 'c:\\Users\\gt\\kiro\\blockchain', env: process.env, maxBuffer: 10*1024*1024 });
  if (r.stdout) log(r.stdout.toString().trim());
  if (r.stderr) log('ERR: ' + r.stderr.toString().trim().slice(0, 500));
  log(`EXIT: ${r.status}`);
  return r.status === 0;
}

const ROOT = 'c:\\Users\\gt\\kiro\\blockchain';

// Check if git already initialized
run('git status', ROOT);
run('git add .', ROOT);
run('git status --short', ROOT);

// Make initial commit
run('git config user.email "chaintickts@project.dev"', ROOT);
run('git config user.name "ChainTickets"', ROOT);
run('git commit -m "feat: initial implementation — Solidity contracts, React frontend, 53 tests passing"', ROOT);
run('git log --oneline -5', ROOT);
log('\n=== Git setup complete ===');
