const fs = require('fs');
const f = 'c:\\Users\\gt\\kiro\\blockchain\\pipeline_output.txt';
if (fs.existsSync(f)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const last = lines.slice(-30).join('\n');
  console.log('=== LAST 30 LINES ===\n' + last);
  console.log('=== TOTAL LINES:', lines.length, '===');
} else {
  console.log('pipeline_output.txt not found');
}
