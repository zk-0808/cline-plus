// staleness-utils.ts - P0 memory staleness utilities
// Calculate weight based on age and TTL, annotate/sweep stale entries.

/** Gaussian-style decay: weight 1.0 -> 0.5 -> 0.1 */
export function calcStalenessWeight(createdDate: string, ttlDays: number): number {
  const ageMs = Date.now() - new Date(createdDate).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 0) return 1.0;
  if (ageDays < ttlDays * 0.5) return 1.0;
  if (ageDays < ttlDays) return 0.5;
  return 0.1;
}

export interface StalenessResult {
  content: string;
  staleCount: number;
  filteredCount: number;
  agingCount: number;
}

/**
 * Process HANDOFF.md content: annotate stale/aging entries.
 * Parses table rows in "实水相期" section,
 * calculates weight, annotates stale entries with HTML comments.
 */
export function processStaleness(content: string): StalenessResult {
  const lines = content.split("\n");
  const result: string[] = [];
  let staleCount = 0, filteredCount = 0, agingCount = 0;
  let inTable = false;
  let staleWarningAdded = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect table header with ttl column
    if (line.includes("| id |") && line.includes("ttl")) {
      inTable = true;
      result.push(line);
      continue;
    }
    // Skip separator rows
    if (inTable && line.startsWith("|----")) {
      result.push(line);
      continue;
    }
    // Process data rows
    if (inTable && line.startsWith("|") && !line.startsWith("|----") && !line.includes("| id |")) {
      const cells = line.split("|").map(s => s.trim()).filter(s => s.length > 0);
      if (cells.length >= 5) {
        const dateStr = cells[3]; // date column
        const ttlStr = cells.length > 5 ? cells[5] : "90";
        const ttlDays = parseInt(ttlStr) || 90;
        const weight = calcStalenessWeight(dateStr, ttlDays);

        if (weight <= 0.1) {
          staleCount++;
          if (!staleWarningAdded) {
            result.push("> **[STALENESS WARNING]** Entries below marked with weight <= 0.1 may be outdated.");
            staleWarningAdded = true;
          }
          result.push(line + " <!-- STALE weight=" + weight + " -->");
        } else if (weight < 1.0) {
          agingCount++;
          result.push(line + " <!-- AGING weight=" + weight + " -->");
        } else {
          result.push(line);
        }
      } else {
        result.push(line);
      }
      continue;
    }
    // Non-table line: exit table mode
    if (inTable && !line.startsWith("|") && line.trim().length > 0) {
      inTable = false;
    }
    result.push(line);
  }

  return {
    content: result.join("\n"),
    staleCount,
    filteredCount,
    agingCount,
  };
}
