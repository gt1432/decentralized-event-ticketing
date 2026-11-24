const fs = require('fs');
const f = 'c:\\Users\\gt\\kiro\\blockchain\\pipeline2_output.txt';
if (fs.existsSync(f)) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  console.log('TOTAL LINES:', lines.length);
  // Print last 120 lines
  console.log(lines.slice(-120).join('\n'));
}
