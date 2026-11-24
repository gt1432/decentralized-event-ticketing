const fs = require('fs');
const f = 'c:\\Users\\gt\\kiro\\blockchain\\pipeline2_output.txt';
if (fs.existsSync(f)) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  console.log(lines.slice(-60).join('\n'));
  console.log('TOTAL LINES:', lines.length);
}
