#!/usr/bin/env node
// trace-stats.js - Print summary statistics from traces.jsonl
// Usage: node scripts/trace-stats.js [path]

const fs = require('fs');
const path = process.argv[2] || './governance/runtime/traces.jsonl';

try {
  const raw = fs.readFileSync(path, 'utf8');
  const lines = raw.trim().split('\n').filter(l => l.length > 0);
  
  const records = lines.map(l => JSON.parse(l));
  
  const stats = {};
  let totalTokens = 0, totalBlocks = 0, totalInjects = 0;
  
  for (const record of records) {
    const key = `${record.hook}/${record.capability}/${record.event}`;
    if (!stats[key]) stats[key] = { count: 0, tokens: 0 };
    stats[key].count++;
    if (record.metrics?.tokens) {
      stats[key].tokens += record.metrics.tokens;
      totalTokens += record.metrics.tokens;
    }
    if (record.event === 'block') totalBlocks++;
    if (record.event === 'inject') totalInjects++;
  }
  
  console.log('=== Governance Trace Stats ====');
  console.log(`Records: ${records.length}`);
  console.log(`Total tokens: ${totalTokens}`);
  console.log(`Blocks: ${totalBlocks} | Injects: ${totalInjects}`);
  console.log('------------------------------------------');
  for (const [key, val] of Object.entries(stats)) {
    console.log(`   ${key}: ${val.count} calls, ${val.tokens} tokens`);
  }
} catch (err) {
  console.error('Error: ' + err.message);
  if (err.code === 'ENOENT') console.log('Trace file not found. Run a session first.');
}
