const fs = require('fs');
const f = 'c:\\Users\\gt\\kiro\\blockchain\\tests_only_out.txt';
if (fs.existsSync(f)) {
  const content = fs.readFileSync(f, 'utf8');
  console.log('LINES:', content.split('\n').length);
  console.log(content);
}
