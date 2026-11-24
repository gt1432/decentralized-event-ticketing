/**
 * Pipeline v2: compile + test (contracts already installed), then frontend install + build.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = 'c:\\Users\\gt\\kiro\\blockchain\\pipeline2_output.txt';
fs.writeFileSync(OUT, '');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(OUT, line);
}

function run(label, cmd, cwd) {
  log(`\n>>> ${label}`);
  log(`CMD: ${cmd}  CWD: ${cwd}`);
  const r = spawnSync(cmd, {
    shell: true,
    cwd,
    env: process.env,
    maxBuffer: 100 * 1024 * 1024,
    timeout: 300000,
  });
  const out = (r.stdout || '').toString();
  const err = (r.stderr || '').toString();
  if (out) log('OUT:\n' + out.slice(0, 5000));
  if (err) log('ERR:\n' + err.slice(0, 2000));
  log(`EXIT: ${r.status}`);
  if (r.error) log(`ERROR: ${r.error.message}`);
  return r.status === 0;
}

const C = 'c:\\Users\\gt\\kiro\\blockchain\\contracts';
const F = 'c:\\Users\\gt\\kiro\\blockchain\\frontend';
const npx = 'c:\\Users\\gt\\kiro\\blockchain\\contracts\\node_modules\\.bin\\hardhat.cmd';

log('=== Phase 2: Compile contracts ===');
const compiled = run('hardhat compile', `"${npx}" compile`, C);
if (!compiled) { log('FATAL: compile failed'); process.exit(1); }

log('\n=== Phase 3: Run tests ===');
const tested = run('hardhat test', `"${npx}" test`, C);
if (!tested) log('WARNING: some tests failed');

log('\n=== Phase 4: Frontend npm install ===');
const fi = run('frontend install', 'npm install', F);
if (!fi) { log('FATAL: frontend install failed'); process.exit(1); }

log('\n=== Phase 5: Frontend build ===');
const fb = run('frontend build', 'npm run build', F);

log('\n=== Done ===');
log(`compile: ${compiled ? 'OK' : 'FAIL'}`);
log(`tests:   ${tested  ? 'PASS' : 'FAIL'}`);
log(`build:   ${fb      ? 'OK' : 'FAIL'}`);
