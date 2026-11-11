import { execSync } from 'child_process';
import fs from 'fs';

try {
  execSync('node ./node_modules/typescript/bin/tsc --noEmit', {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  console.log('TSC ALL PASS: Zero errors in entire project.');
} catch (err) {
  const stdout = err.stdout || '';
  const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
  console.log(`Total lines in tsc output: ${lines.length}`);
  
  const errors = [];
  for (const line of lines) {
    if (line.includes(': error TS')) {
      errors.push(line);
    }
  }
  console.log(`Total TS error messages: ${errors.length}`);
  
  const byFile = {};
  for (const errLine of errors) {
    const colonIdx = errLine.indexOf('(');
    const file = colonIdx > 0 ? errLine.slice(0, colonIdx) : errLine.split(':')[0];
    byFile[file] = (byFile[file] || 0) + 1;
  }
  
  console.log('\n--- Breakdown by file ---');
  for (const [f, count] of Object.entries(byFile).sort((a,b) => b[1] - a[1])) {
    console.log(`${count.toString().padStart(3, ' ')} errors: ${f}`);
  }
  
  console.log('\n--- Sample of error messages ---');
  errors.slice(0, 15).forEach(e => console.log('  ', e));
}
