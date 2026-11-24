const { spawnSync } = require('child_process');
const fs = require('fs');
const OUT = 'c:\\Users\\gt\\kiro\\blockchain\\build_only_out.txt';
fs.writeFileSync(OUT, '');

function log(msg) {
  const line = `${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(OUT, line);
}

function run(label, cmd, cwd) {
  log(`\n>>> ${label}: ${cmd}`);
  const r = spawnSync(cmd, {
    shell: true, cwd, env: process.env,
    maxBuffer: 50 * 1024 * 1024, timeout: 180000,
  });
  if (r.stdout) log(r.stdout.toString().slice(0, 5000));
  if (r.stderr) log('ERR: ' + r.stderr.toString().slice(0, 3000));
  log(`EXIT: ${r.status}`);
  return r.status === 0;
}

const F = 'c:\\Users\\gt\\kiro\\blockchain\\frontend';
log('=== Frontend Build Only ===');
run('build', 'npm run build', F);
