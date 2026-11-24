const { spawnSync } = require('child_process');
const fs = require('fs');
const OUT = 'c:\\Users\\gt\\kiro\\blockchain\\tests_only_out.txt';
fs.writeFileSync(OUT, '');

function log(msg) {
  const line = `${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(OUT, line);
}

const C = 'c:\\Users\\gt\\kiro\\blockchain\\contracts';
const hardhat = `${C}\\node_modules\\.bin\\hardhat.cmd`;

log('=== Hardhat Tests ===');
const r = spawnSync(`"${hardhat}" test`, {
  shell: true, cwd: C, env: process.env,
  maxBuffer: 50 * 1024 * 1024, timeout: 120000,
});
if (r.stdout) log(r.stdout.toString());
if (r.stderr) log('STDERR: ' + r.stderr.toString().slice(0, 2000));
log(`EXIT: ${r.status}`);
