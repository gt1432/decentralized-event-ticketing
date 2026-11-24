const fs = require('fs');
const f = 'c:\\Users\\gt\\kiro\\blockchain\\build_only_out.txt';
const c = fs.readFileSync(f, 'utf8');
console.log('LINES:', c.split('\n').length);
console.log(c);
