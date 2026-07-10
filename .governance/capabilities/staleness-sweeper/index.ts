// index.ts - staleness-sweeper capability
// Scans HANDOFF.md for stale entries and updates their weight/status.
// Can be run manually or from a hook.

import { calcStalenessWeight } from '../../plugin/staleness-utils.js';

export interface SweepInput {
  args: {
    handoffPath: string;
    ruleBlock: boolean; // if true, delete stale entries instead of marking
  };
}

export interface SweepResult {
  intent: 'pass';
  data: {
    sweeped: boolean;
    staleCount: number;
    expiredCount: number;
    updatedCount: number;
  };
  metadata?: {
    writeError?: string;
  };
}

export async function stalenessSweeper(input: SweepInput): Promise<SweepResult> {
  const { handoffPath, ruleBlock = false } = input.args;
  const fs = await import('node:fs/promises');
  
  let content: string;
  try {
    content = await fs.readFile(handoffPath, 'utf8');
  } catch {
    return { intent: 'pass', data: { sweeped: false, staleCount: 0, expiredCount: 0, updatedCount: 0 }, metadata: { writeError: 'HANDOFF.md not found' } };
  }
  
  const lines = content.split('\n');
  const result: string[] = [];
  let staleCount = 0, expiredCount = 0, updatedCount = 0;
  let inTable = false;
  
  for (const line of lines) {
    // Detect table header
    if (line.includes('| id |') && line.includes('ttl')) {
      inTable = true;
      result.push(line);
      continue;
    }
    if (inTable && line.startsWith('|----')) {
      result.push(line);
      continue;
    }
    // Process data rows
    if (!inTable || !line.startsWith('|') || line.includes('| id |')) {
      if (line.trim().length === 0) {
        inTable = false;
      }
      result.push(line);
      continue;
    }
    
    // Parse cells: | id | exp | src | date | status | ttl | lastVal | weight |
    const cells = line.split('|').map(s => s.trim()).filter(s => s.length > 0);
    if (cells.length < 6) {
      result.push(line);
      continue;
    }
    
    const dateStr = cells[3];
    const ttlStr = cells[5];
    const ttlDays = parseInt(ttlStr) || 90;
    const lastValidated = cells[6] || '';

    // Use calcStalenessWeight for consistency with processStaleness()
    // This ensures sweeper respects last_validated from refreshEntry()
    const weight = calcStalenessWeight(dateStr, ttlDays, lastValidated);

    // Check if expired (age > ttl * 2, based on weight=0.1 floor)
    const ageMs = Date.now() - (lastValidated ? new Date(lastValidated).getTime() : new Date(dateStr).getTime());
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const expired = ageDays > ttlDays * 2;
    
    if (ruleBlock && expired) {
      // Skip this row (delete it)
      expiredCount++;
      continue;
    }
    
    if (weight <= 0.1) staleCount++;

    // Update weight and last_validated columns (lastValidated already defined above)
    const newCells = [...cells.slice(0, 5), ttlStr, lastValidated, weight.toFixed(1)];
    if (weight <= 0.1) newCells[4] = '已过期'; // mark as expired
    else if (weight < 1.0 && cells[4] === '待 review') newCells[4] = '已审'; // reviewed
    
    const newRow = '| ' + newCells.join(' | ') + ' |';
    result.push(newRow);
    updatedCount++;
  }
  
  // Write back
  const newContent = result.join('\n');
  try {
    await fs.writeFile(handoffPath, newContent, 'utf8');
  } catch (err) {
    return { intent: 'pass', data: { sweeped: false, staleCount, expiredCount, updatedCount }, metadata: { writeError: String(err) } };
  }
  
  return {
    intent: 'pass',
    data: {
      sweeped: true,
      staleCount,
      expiredCount,
      updatedCount,
    },
  };
}
