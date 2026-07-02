// 集成测试：mock 上游，覆盖决策文档 §验证计划的 5 个场景 + 扩展场景
// 运行：npm test（编译 + node --test）
// 注意：测试不实际调用 DDG，避免触发真实 bot detection
//
// 重构适配说明：
//   - 场景 1-3, 6-7：外部 API 未变，仅调整内部状态断言
//   - 场景 4, 5, 8, 10：(wrapper as any).blockedUntil 改为 breaker.setStateForTesting()
//   - 场景 9：HalfOpen 态引入探测请求，第 2/3 批次从 3 calls 改为 2 calls

import { test } from 'node:test';
import assert from 'node:assert';
import {
  ThrottledSearchWrapper,
  SearchError,
  SearchResult,
  UpstreamSearcher,
  UpstreamFetcher,
} from '../index';

// ===== Mock 上游 =====

class MockSearcher implements UpstreamSearcher {
  calls: { query: string; maxResults: number }[] = [];
  results: SearchResult[] = [];
  failMode: 'none' | 'bot' | 'http' = 'none';

  async search(query: string, options?: { maxResults?: number }): Promise<SearchResult[]> {
    this.calls.push({ query, maxResults: options?.maxResults ?? 10 });
    if (this.failMode === 'bot') {
      const err = new Error('DuckDuckGo bot detection triggered') as any;
      err.code = 'BOT_DETECTED';
      throw err;
    }
    if (this.failMode === 'http') {
      const err = new Error('HTTP 500') as any;
      err.code = 'HTTP_ERROR';
      throw err;
    }
    return this.results;
  }

  reset(): void {
    this.calls = [];
    this.results = [];
    this.failMode = 'none';
  }
}

class MockFetcher implements UpstreamFetcher {
  calls: { url: string; maxLen: number }[] = [];
  content = 'mock fetched content';

  async fetchAndParse(url: string, maxContentLength?: number): Promise<string> {
    this.calls.push({ url, maxLen: maxContentLength ?? 8000 });
    return this.content;
  }
}

function makeResults(n: number): SearchResult[] {
  return Array.from({ length: n }, (_, i) => ({
    title: `Result ${i + 1}`,
    link: `https://example.com/${i + 1}`,
    snippet: `Snippet ${i + 1}`,
    position: i + 1,
  }));
}

// ===== 测试场景（对应决策文档 §验证计划）=====

test('场景 1: 正常 search（max_results=10）返回结果且透传 query', async () => {
  const searcher = new MockSearcher();
  searcher.results = makeResults(5);
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  const results = await wrapper.search('test query', 10);

  assert.strictEqual(results.length, 5);
  assert.strictEqual(searcher.calls.length, 1);
  assert.strictEqual(searcher.calls[0].query, 'test query');
  assert.strictEqual(searcher.calls[0].maxResults, 10);
  // 成功后状态完全清空
  const state = wrapper.getState();
  assert.strictEqual(state.recentFailures, 0);
  assert.strictEqual(state.blockedUntil, null);
  assert.strictEqual(state.circuitBreakCount, 0);
});

test('场景 2: max_results=50 被 cap 到 10（禁分页）', async () => {
  const searcher = new MockSearcher();
  searcher.results = makeResults(10);
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  await wrapper.search('test', 50);

  assert.strictEqual(searcher.calls[0].maxResults, 10);
});

test('场景 2b: max_results 默认值 10', async () => {
  const searcher = new MockSearcher();
  searcher.results = makeResults(3);
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  await wrapper.search('test');

  assert.strictEqual(searcher.calls[0].maxResults, 10);
});

test('场景 3: 连续 3 次 BOT_DETECTED 触发熔断（第 4 次被 CIRCUIT_OPEN 拦截）', async () => {
  const searcher = new MockSearcher();
  searcher.failMode = 'bot';
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  // 第 1 次失败：N=1，未达阈值，不熔断
  await assert.rejects(() => wrapper.search('q1'), (e: any) => e.code === 'BOT_DETECTED');
  let state = wrapper.getState();
  assert.strictEqual(state.recentFailures, 1);
  assert.strictEqual(state.blockedUntil, null, '第 1 次失败不应熔断');
  assert.strictEqual(state.circuitBreakCount, 0);

  // 第 2 次失败：N=2，未达阈值，不熔断
  await assert.rejects(() => wrapper.search('q2'), (e: any) => e.code === 'BOT_DETECTED');
  state = wrapper.getState();
  assert.strictEqual(state.recentFailures, 2);
  assert.strictEqual(state.blockedUntil, null, '第 2 次失败不应熔断');
  assert.strictEqual(state.circuitBreakCount, 0);

  // 第 3 次失败：N=3，达阈值，触发熔断
  await assert.rejects(() => wrapper.search('q3'), (e: any) => e.code === 'BOT_DETECTED');
  state = wrapper.getState();
  assert.strictEqual(state.recentFailures, 0, '熔断后应清空 recentFailures');
  assert.strictEqual(state.circuitBreakCount, 1, '熔断后 circuitBreakCount++');
  assert.ok(state.blockedUntil, '第 3 次失败应触发熔断');
  const expected = Date.now() + 30_000;
  const diff = Math.abs(state.blockedUntil!.getTime() - expected);
  assert.ok(diff < 1000, `第 1 次熔断应 ~30s，实际偏差 ${diff}ms`);

  // 第 4 次调用：熔断期内，应被 CIRCUIT_OPEN 拦截（不调上游）
  const callsBefore = searcher.calls.length;
  await assert.rejects(() => wrapper.search('q4'), (e: any) => {
    assert.strictEqual(e.code, 'CIRCUIT_OPEN');
    assert.ok(e.blockedUntil, 'CIRCUIT_OPEN 应含 blockedUntil');
    return true;
  });
  assert.strictEqual(searcher.calls.length, callsBefore, '熔断期内不应调上游');
});

test('场景 4: 熔断期间调用立即抛 CIRCUIT_OPEN（不发 HTTP）', async () => {
  const searcher = new MockSearcher();
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  // 手动设置熔断状态（模拟已触发熔断）
  const future = new Date(Date.now() + 60_000);
  (wrapper as any).breaker.setStateForTesting('open', future);

  await assert.rejects(
    () => wrapper.search('q'),
    (e: any) => {
      assert.strictEqual(e.code, 'CIRCUIT_OPEN');
      assert.ok(e.blockedUntil);
      return true;
    },
  );

  assert.strictEqual(searcher.calls.length, 0, '熔断期内不应调上游');
});

test('场景 5: 熔断过期后调用正常（HalfOpen 探测成功 → Closed 恢复）', async () => {
  const searcher = new MockSearcher();
  searcher.results = makeResults(2);
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  // 设置已过期的 blockedUntil（状态机自动 Open → HalfOpen → 探测 → Closed）
  (wrapper as any).breaker.setStateForTesting('open', new Date(Date.now() - 1000));

  const results = await wrapper.search('recovery test');
  assert.strictEqual(results.length, 2);
  // 探测成功后状态完全清空
  const state = wrapper.getState();
  assert.strictEqual(state.blockedUntil, null);
  assert.strictEqual(state.recentFailures, 0);
  assert.strictEqual(state.circuitBreakCount, 0, '成功应清空 circuitBreakCount');
});

test('场景 6: HTTP_ERROR 不触发熔断（只 BOT_DETECTED 触发）', async () => {
  const searcher = new MockSearcher();
  searcher.failMode = 'http';
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  await assert.rejects(() => wrapper.search('q1'), (e: any) => e.code === 'HTTP_ERROR');
  const state = wrapper.getState();
  assert.strictEqual(state.recentFailures, 0, 'HTTP_ERROR 不应记录失败');
  assert.strictEqual(state.blockedUntil, null, 'HTTP_ERROR 不应触发熔断');
  assert.strictEqual(state.circuitBreakCount, 0);
});

test('场景 7: 成功调用清空所有状态（部分恢复后成功）', async () => {
  const searcher = new MockSearcher();
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  // 2 次失败（未达熔断阈值）
  searcher.failMode = 'bot';
  await assert.rejects(() => wrapper.search('q1'));
  await assert.rejects(() => wrapper.search('q2'));
  assert.strictEqual(wrapper.getState().recentFailures, 2);

  // 成功
  searcher.failMode = 'none';
  searcher.results = makeResults(1);
  await wrapper.search('q3');
  const state = wrapper.getState();
  assert.strictEqual(state.recentFailures, 0, '成功应清空 recentFailures');
  assert.strictEqual(state.blockedUntil, null);
  assert.strictEqual(state.circuitBreakCount, 0);
});

test('场景 8: fetch_content 透传（不加节流，熔断期也正常）', async () => {
  const searcher = new MockSearcher();
  const fetcher = new MockFetcher();
  fetcher.content = 'real content here';
  const wrapper = new ThrottledSearchWrapper(searcher, fetcher);

  // 即使熔断状态，fetch 也应正常工作（fetch_content 绕过熔断器）
  (wrapper as any).breaker.setStateForTesting('open', new Date(Date.now() + 60_000));

  const content = await wrapper.fetchContent('https://example.com/page', 5000);
  assert.strictEqual(content, 'real content here');
  assert.strictEqual(fetcher.calls.length, 1);
  assert.strictEqual(fetcher.calls[0].url, 'https://example.com/page');
  assert.strictEqual(fetcher.calls[0].maxLen, 5000);
});

test('场景 9: 指数退避递增（circuitBreakCount 增长 → 熔断时长 30s/2min/10min）', async () => {
  const searcher = new MockSearcher();
  searcher.failMode = 'bot';
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  // 第 1 次熔断（circuitBreakCount 0→1）：30s
  // Closed 态：3 次 BOT_DETECTED → 触发熔断
  for (let i = 0; i < 3; i++) {
    await assert.rejects(() => wrapper.search(`q1-${i}`));
  }
  let state = wrapper.getState();
  assert.strictEqual(state.circuitBreakCount, 1);
  assert.ok(
    Math.abs(state.blockedUntil!.getTime() - (Date.now() + 30_000)) < 1000,
    '第 1 次熔断应 30s',
  );

  // 模拟熔断过期 + 第 2 次熔断（circuitBreakCount 1→2）：2min
  // HalfOpen 态：第 1 次调用 = 探测（失败 → 立即重新熔断），第 2 次调用 = Open 拒绝
  (wrapper as any).breaker.setStateForTesting('open', new Date(Date.now() - 1), 1);
  for (let i = 0; i < 2; i++) {
    await assert.rejects(() => wrapper.search(`q2-${i}`));
  }
  state = wrapper.getState();
  assert.strictEqual(state.circuitBreakCount, 2);
  assert.ok(
    Math.abs(state.blockedUntil!.getTime() - (Date.now() + 120_000)) < 1000,
    '第 2 次熔断应 2min',
  );

  // 模拟熔断过期 + 第 3 次熔断（circuitBreakCount 2→3）：10min（封顶）
  (wrapper as any).breaker.setStateForTesting('open', new Date(Date.now() - 1), 2);
  for (let i = 0; i < 2; i++) {
    await assert.rejects(() => wrapper.search(`q3-${i}`));
  }
  state = wrapper.getState();
  assert.strictEqual(state.circuitBreakCount, 3);
  assert.ok(
    Math.abs(state.blockedUntil!.getTime() - (Date.now() + 600_000)) < 1000,
    '第 3 次熔断应 10min（封顶）',
  );
});

test('场景 10: 熔断后清空 recentFailures（再失败从 0 重新计数）', async () => {
  const searcher = new MockSearcher();
  searcher.failMode = 'bot';
  const wrapper = new ThrottledSearchWrapper(searcher, new MockFetcher());

  // 触发第 1 次熔断
  for (let i = 0; i < 3; i++) {
    await assert.rejects(() => wrapper.search(`q-${i}`));
  }
  let state = wrapper.getState();
  assert.strictEqual(state.recentFailures, 0, '熔断后应清空');
  assert.strictEqual(state.circuitBreakCount, 1);

  // 熔断过期后 1 次失败：HalfOpen 探测失败 → 重新熔断，recentFailures 清空后计 0
  // 注意：HalfOpen 探测失败触发 triggerBreak() 会清空 recentFailures，
  // 所以探测失败后 recentFailures = 0（不是旧版的 1）
  (wrapper as any).breaker.setStateForTesting('open', new Date(Date.now() - 1), 1);
  await assert.rejects(() => wrapper.search('q-recover'));
  state = wrapper.getState();
  // HalfOpen 探测失败 → triggerBreak 清空 recentFailures → 0
  // 这是与旧版的差异：旧版直接记录到 recentFailures（得 1），
  // 新版 HalfOpen 探测失败走 triggerBreak() 清空后无新记录（得 0）
  assert.strictEqual(state.recentFailures, 0, 'HalfOpen 探测失败后 recentFailures 应清空');
  assert.strictEqual(state.circuitBreakCount, 2, '探测失败触发第 2 次熔断');
});

console.log('集成测试套件加载完成（10 个场景）');
