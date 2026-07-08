// index.ts - Tracer Capability implementation
// Lightweight local tracing: JSONL per hook call, zero external deps.
// Design: append-only write, no read on startup, no blocking.

// Main entry point: trace() is called from plugin/index.ts hooks.

import { appendFile } from "node:fs/promises";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TraceRecord, HookType, TraceEvent, TraceMetrics } from "./types.js";

export * from "./types.js";

/**
 * Write a single trace record to JSONL file.
  * Fire-and-forget: no await, no return value, no throw.
  * Meant to be called from synchronous hook code without blocking.
  */
export function trace(p: {
  session_id: string;
  hook: HookType;
  capability: string;
  event: TraceEvent;
  metrics?: TraceMetrics;
  note?: string;
  workspacePath: string;
  tracePath: string;
  consoleOutput?: boolean;
}): void {
  const record: TraceRecord = {
    ts: new Date().toISOString(),
    session_id: p.session_id,
    hook: p.hook,
    capability: p.capability,
    event: p.event,
    metrics: p.metrics,
    note: p.note,
  };

  // Console output (if enabled)
  if (p.consoleOutput) {
    console.log(`TRACE [${p.hook}] ${p.capability} ${p.event}${p.metrics ? ' ' + JSON.stringify(p.metrics) : ''}` );
  }

  // JSONL append (synchronous, no await)
  try {
    const fullPath = p.workspacePath + "/" + p.tracePath;
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify(record) + "\n";
    appendFile(fullPath, line, "utf8");
  } catch (err) {
    // Silent failure - tracing must never block execution
    console.warn(`TRACE write failed: ${err}`);
  }
}
/**
 * Synchronous version of trace(), for use in hooks that require sync return (e.g. beforeTool).
 * Uses writeFileSync with flag='a' instead of appendFile.
 */
export function traceSync(p: {
  session_id: string;
  hook: HookType;
  capability: string;
  event: TraceEvent;
  metrics?: TraceMetrics;
  note?: string;
  workspacePath: string;
  tracePath: string;
  consoleOutput?: boolean;
}): void {
  const record: TraceRecord = {
    ts: new Date().toISOString(),
    session_id: p.session_id,
    hook: p.hook,
    capability: p.capability,
    event: p.event,
    metrics: p.metrics,
    note: p.note,
  };

  if (p.consoleOutput) {
    console.log(`TRACE [${p.hook}] ${p.capability} ${p.event}`);
  }

  try {
    const fullPath = p.workspacePath + "/" + p.tracePath;
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify(record) + "\n";
    // writeFileSync already imported("node:fs");
    writeFileSync(fullPath, line, { flag: "a", encoding: "utf8" });
  } catch (err) {
    console.warn(`TRACE sync write failed: ${err}`);
  }
}

/**
 * Estimate tokens from chars (rough heuristic ratio = 4).
 */
export function estTokens(chars: number): number {
  return Math.round(chars / 4);
}
