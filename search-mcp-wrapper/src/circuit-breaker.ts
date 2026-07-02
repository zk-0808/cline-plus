// 熔断器模块：显式三态状态机（Closed / HalfOpen / Open）
// 仅依赖 ./config（WrapperConfig）
//
// 状态转换图：
//   Closed  ──(failure, count>=threshold)──→ Open
//   Closed  ──(failure, count<threshold)──→  Closed
//   Open    ──(backoff 未过期)────────────→  Open
//   Open    ──(backoff 过期)─────────────→   HalfOpen（自动转换，允许一个探测请求）
//   HalfOpen ──(probe 成功)──────────────→   Closed（完全重置）
//   HalfOpen ──(probe 失败)──────────────→   Open（circuitBreakCount++, 更长退避）

import { WrapperConfig } from './config';

/** 熔断器三态 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/** checkAndAllow() 的返回值 */
export interface CheckResult {
  allowed: boolean;
  state: CircuitState;
  blockedUntil?: Date;
}

/** getState() 的返回值（调试/监控用） */
export interface CircuitBreakerSnapshot {
  state: CircuitState;
  circuitBreakCount: number;
  recentFailures: number;
  blockedUntil: Date | null;
}

export class CircuitBreaker {
  private _state: CircuitState = 'closed';
  private _recentFailures: Date[] = [];
  private _circuitBreakCount = 0;
  private _blockedUntil: Date | null = null;
  /** HalfOpen 态下是否已有探测请求在途（防并发穿透） */
  private _halfOpenProbeInFlight = false;

  constructor(private readonly config: WrapperConfig) {}

  /**
   * 检查当前状态，决定是否允许请求通过。
   *
   * - Closed：始终允许
   * - Open + 未过期：拒绝（返回 blockedUntil）
   * - Open + 已过期：自动转 HalfOpen，允许一个探测请求
   * - HalfOpen + 无在途探测：允许（标记 probe in-flight）
   * - HalfOpen + 有在途探测：拒绝（防并发）
   */
  checkAndAllow(): CheckResult {
    if (this._state === 'closed') {
      return { allowed: true, state: 'closed' };
    }

    if (this._state === 'open') {
      if (this._blockedUntil && new Date() < this._blockedUntil) {
        // Open + 未过期 → 拒绝
        return { allowed: false, state: 'open', blockedUntil: this._blockedUntil ?? undefined };
      }
      // Open + 已过期 → 自动转 HalfOpen，允许探测
      this._state = 'half-open';
      this._halfOpenProbeInFlight = true;
      return { allowed: true, state: 'half-open' };
    }

    // half-open
    if (this._halfOpenProbeInFlight) {
      // 已有探测在途 → 拒绝并发请求
      return {
        allowed: false,
        state: 'half-open',
        blockedUntil: this._blockedUntil ?? undefined,
      };
    }
    // 无在途探测 → 允许，标记 in-flight
    this._halfOpenProbeInFlight = true;
    return { allowed: true, state: 'half-open' };
  }

  /**
   * 记录失败（仅 BOT_DETECTED 时由 wrapper 调用）。
   *
   * - Closed 态：累加 recentFailures，达阈值触发熔断
   *   - Closed → Closed：recentFailures.length < threshold
   *   - Closed → Open：recentFailures.length >= threshold（清空 failures, count++, 设 blockedUntil）
   * - HalfOpen 态：探测失败，立即重新熔断
   *   - HalfOpen → Open（count++, 更长退避）
   */
  recordFailure(): void {
    const now = new Date();

    if (this._state === 'closed') {
      this._recentFailures.push(now);
      // 滑动窗口修剪：移除窗口外的失败时间戳
      this._recentFailures = this._recentFailures.filter(
        (t) => now.getTime() - t.getTime() < this.config.failureWindowMs,
      );

      if (this._recentFailures.length < this.config.failureThreshold) {
        return; // Closed → Closed：未达阈值
      }

      // Closed → Open：触发熔断
      this.triggerBreak(now);
      return;
    }

    if (this._state === 'half-open') {
      // HalfOpen → Open：探测失败，立即重新熔断
      this._halfOpenProbeInFlight = false;
      this.triggerBreak(now);
    }
  }

  /**
   * 记录成功：完全重置到 Closed 态。
   * 在 Closed 和 HalfOpen 态均可调用（HalfOpen 探测成功 → Closed）。
   */
  recordSuccess(): void {
    this._state = 'closed';
    this._recentFailures = [];
    this._circuitBreakCount = 0;
    this._blockedUntil = null;
    this._halfOpenProbeInFlight = false;
  }

  /**
   * 标记探测请求完成（无论成败）。由 wrapper 在 finally 块中调用。
   * 清除 halfOpenProbeInFlight 标志，允许后续请求触发新的状态转换。
   */
  completeProbe(): void {
    this._halfOpenProbeInFlight = false;
  }

  /** 获取当前状态快照（调试/监控用） */
  getState(): CircuitBreakerSnapshot {
    return {
      state: this._state,
      circuitBreakCount: this._circuitBreakCount,
      recentFailures: this._recentFailures.length,
      blockedUntil: this._blockedUntil,
    };
  }

  /**
   * 测试辅助：直接设置内部状态（跳过状态机转换）。
   * 仅供测试用例使用，生产代码不应调用此方法。
   */
  setStateForTesting(
    state: CircuitState,
    blockedUntil?: Date | null,
    circuitBreakCount?: number,
  ): void {
    this._state = state;
    this._blockedUntil = blockedUntil ?? null;
    if (circuitBreakCount !== undefined) {
      this._circuitBreakCount = circuitBreakCount;
    }
    this._halfOpenProbeInFlight = false;
  }

  // ===== 内部方法 =====

  /**
   * 触发熔断：清空 recentFailures、递增 circuitBreakCount、设置 blockedUntil。
   * 从 Closed 和 HalfOpen 态均可调用。
   */
  private triggerBreak(now: Date): void {
    this._recentFailures = [];
    this._circuitBreakCount++;
    this._state = 'open';
    const delay = this.getBackoffDelay();
    this._blockedUntil = new Date(now.getTime() + delay);
  }

  /** 根据 circuitBreakCount 计算退避时长（封顶在数组末尾） */
  private getBackoffDelay(): number {
    const { backoffDelays } = this.config;
    const idx = Math.min(this._circuitBreakCount - 1, backoffDelays.length - 1);
    return backoffDelays[idx];
  }
}
