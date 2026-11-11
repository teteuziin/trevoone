import { execSync } from 'child_process';

try {
  const stdout = execSync('node ./node_modules/typescript/bin/tsc --noEmit', {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  console.log('TSC SUCCESS: No errors found anywhere.');
} catch (err) {
  const lines = err.stdout.split('\n');
  const aiLines = lines.filter(l => 
    l.includes('ai-actions.ts') || 
    l.includes('destiny-ai-client.ts') || 
    l.includes('configuracoes/ia') ||
    l.includes('consultancy-ai-settings-view.tsx')
  );
  console.log(`Found ${aiLines.length} errors in AI & related files:`);
  aiLines.forEach(l => console.log('  ', l));
}
