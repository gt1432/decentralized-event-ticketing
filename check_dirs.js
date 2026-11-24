const fs = require('fs');
const path = require('path');

const dirs = [
  'c:\\Users\\gt\\kiro\\blockchain\\contracts\\node_modules',
  'c:\\Users\\gt\\kiro\\blockchain\\frontend\\node_modules',
  'c:\\Users\\gt\\kiro\\blockchain\\node_modules',
];

for (const d of dirs) {
  const exists = fs.existsSync(d);
  const count = exists ? fs.readdirSync(d).length : 0;
  console.log(`${d}: ${exists ? 'EXISTS (' + count + ' entries)' : 'NOT FOUND'}`);
}

// Check if hardhat is installed
const hh = 'c:\\Users\\gt\\kiro\\blockchain\\contracts\\node_modules\\hardhat';
console.log('hardhat installed:', fs.existsSync(hh));
const oz = 'c:\\Users\\gt\\kiro\\blockchain\\contracts\\node_modules\\@openzeppelin';
console.log('@openzeppelin installed:', fs.existsSync(oz));
