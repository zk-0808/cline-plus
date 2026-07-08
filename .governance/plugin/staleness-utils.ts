// staleness-utils.ts - P0 memory staleness utilities
// Calculate weight based on age and TTL, annotate/sweep stale entries.
// Design decisions:
//   staleness-refresh: last_validated only updated via explicit refreshEntry()
//   stale-injection: weight=0.1 entries INJECTED WITH ANNOTATION (not filtered)

/** Gaussian-style decay: weight 1.0 -> 0.5 -> 0.1 */
export function calcStalenessWeight(createdDate: string, ttlDays: number, lastValidated?: string): number {
  const created = new Date(createdDate).getTime();
  const validated = lastValidated ? new Date(lastValidated).getTime() : 0;
  const referenceDate = Math.max(created, validated);
  const ageMs = Date.now() - referenceDate;
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
 * Parses table rows in "待沈渀经验" section,
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
        const lastValidated = cells.length > 6 ? cells[6] : undefined;
        const weight = calcStalenessWeight(dateStr, ttlDays, lastValidated);

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

export function refreshEntry(content: string, entryId: string): { content: string; found: boolean } {
  const lines = content.split("\n");
  let found = false;
  const now = new Date().toISOString();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("|") && line.includes(entryId)) {
      const cells = line.split("|").map(s => s.trim());
      if (cells.length >= 8 && cells[1] === entryId) {
        cells[7] = " " + now + " ";
        lines[i] = cells.join("|");
        found = true;
        break;
      }
    }
  }

  return { content: lines.join("\n"), found };
}
