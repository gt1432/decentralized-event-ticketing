/**
 * Pipeline script: install contracts deps, compile, run tests, install frontend deps, build frontend.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'pipeline_output.txt');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(OUT, line);
}

function run(label, cmd, cwd) {
  log(`>>> ${label}: ${cmd}`);
  const result = spawnSync(cmd, {
    shell: true,
    cwd: cwd || __dirname,
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
  });
  const stdout = result.stdout ? result.stdout.toString() : '';
  const stderr = result.stderr ? result.stderr.toString() : '';
  if (stdout) log('STDOUT:\n' + stdout.slice(0, 4000));
  if (stderr) log('STDERR:\n' + stderr.slice(0, 2000));
  log(`Exit: ${result.status}`);
  return result.status === 0;
}

fs.writeFileSync(OUT, '');
log('=== ChainTickets Build Pipeline ===');

const contractsDir = path.join(__dirname, 'contracts');
const frontendDir  = path.join(__dirname, 'frontend');

// 1. Install contracts (use --no-workspaces to stay isolated)
log('\n--- Phase 1: contracts npm install ---');
if (!run('contracts npm install', 'npm install --no-workspaces', contractsDir)) {
  log('FATAL: contracts npm install failed'); process.exit(1);
}

// 2. Compile
log('\n--- Phase 2: hardhat compile ---');
const npx = 'npx.cmd';
if (!run('compile', `${npx} hardhat compile`, contractsDir)) {
  log('FATAL: compile failed'); process.exit(1);
}

// 3. Test
log('\n--- Phase 3: hardhat test ---');
const testPassed = run('test', `${npx} hardhat test`, contractsDir);
if (!testPassed) log('WARNING: some tests failed');

// 4. Frontend install
log('\n--- Phase 4: frontend npm install ---');
if (!run('frontend install', 'npm install --no-workspaces', frontendDir)) {
  log('FATAL: frontend npm install failed'); process.exit(1);
}

// 5. Frontend build
log('\n--- Phase 5: frontend build ---');
const buildPassed = run('build', 'npm run build', frontendDir);

log('\n=== Pipeline complete ===');
log(`Tests:  ${testPassed  ? 'PASSED' : 'SOME FAILURES'}`);
log(`Build:  ${buildPassed ? 'SUCCESS' : 'FAILED'}`);
