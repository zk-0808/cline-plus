// 配置模块：WrapperConfig 接口 + DEFAULTS 常量 + loadConfig() 环境变量解析
// 无项目内依赖——纯配置层
// 对应决策：D-2026-06-26-search-adopt-mcp-throttle-wrapper

/**
 * Wrapper 运行时配置（熔断参数 + max_results 上限）
 * 由 loadConfig() 从环境变量解析，缺失字段回退到 DEFAULTS
 */
export interface WrapperConfig {
  /** max_results 强制上限（SKILL §1.4.1 R1/R2/R3 每路 max_results=10，禁分页） */
  maxResultsCap: number;
  /** 指数退避熔断时长数组（毫秒），索引 = circuitBreakCount - 1（封顶在末尾） */
  backoffDelays: number[];
  /** 触发熔断的失败次数阈值（滑动窗口内） */
  failureThreshold: number;
  /** 滑动窗口时长（毫秒），窗口外的失败时间戳不计入 */
  failureWindowMs: number;
}

/** 默认配置值（原 index.ts 中 ThrottledSearchWrapper 的 static readonly 常量） */
export const DEFAULTS: WrapperConfig = {
  maxResultsCap: 10,
  backoffDelays: [30_000, 120_000, 600_000],
  failureThreshold: 3,
  failureWindowMs: 3_600_000,
};

/**
 * 从环境变量加载配置，缺失字段回退到 DEFAULTS。
 *
 * 支持的环境变量：
 *   SEARCH_MAX_RESULTS_CAP    — max_results 上限（正整数）
 *   SEARCH_BACKOFF_DELAYS_MS  — 退避时长，逗号分隔毫秒值（如 "30000,120000,600000"）
 *   SEARCH_FAILURE_THRESHOLD  — 熔断阈值（正整数）
 *   SEARCH_FAILURE_WINDOW_MS  — 滑动窗口毫秒（正整数）
 */
export function loadConfig(): WrapperConfig {
  return {
    maxResultsCap: parsePositiveInt(
      process.env.SEARCH_MAX_RESULTS_CAP,
      DEFAULTS.maxResultsCap,
    ),
    backoffDelays: parseBackoffDelays(
      process.env.SEARCH_BACKOFF_DELAYS_MS,
      DEFAULTS.backoffDelays,
    ),
    failureThreshold: parsePositiveInt(
      process.env.SEARCH_FAILURE_THRESHOLD,
      DEFAULTS.failureThreshold,
    ),
    failureWindowMs: parsePositiveInt(
      process.env.SEARCH_FAILURE_WINDOW_MS,
      DEFAULTS.failureWindowMs,
    ),
  };
}

// ===== 内部解析工具 =====

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseBackoffDelays(raw: string | undefined, fallback: number[]): number[] {
  if (!raw) return fallback;
  const parts = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parts.length > 0 ? parts : fallback;
}
