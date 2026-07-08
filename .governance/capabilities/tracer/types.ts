// types.ts - Tracer Capability types
// Lightweight local tracing: JSONL per hook call, zero external deps

/** 发选 trace 表示 */
export interface TraceRecord {
  ts: string;
  session_id: string;
  hook: HookType;
  capability: string;
  event: TraceEvent;
  metrics?: TraceMetrics;
  note?: string;
}

export type HookType = "session-start" | "pre-tool" | "post-tool" | "pre-compact";
export type TraceEvent = "inject" | "block" | "pass" | "snapshot" | "sweep" | "error";

export interface TraceMetrics {
  chars?: number;
  tokens?: number;
  duration_ms?: number;
  blocked_count?: number;
  sources_count?: number;
  stale_count?: number;
  filtered_count?: number;
}

export interface TracerConfig {
  enabled: boolean;
  args: {
    tracePath: string;
    consoleOutput: boolean;
  };
}
