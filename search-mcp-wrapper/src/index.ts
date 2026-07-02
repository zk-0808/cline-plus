#!/usr/bin/env node
// MCP 反-bot 节流 wrapper（方案 C）— 重构后入口模块
// 对应决策：D-2026-06-26-search-adopt-mcp-throttle-wrapper
//
// 架构（单向依赖，无循环）：
//   index.ts ──→ circuit-breaker.ts ──→ config.ts
//
// 本模块职责：
//   1. 类型导出（SearchResult, SearchError, UpstreamSearcher, UpstreamFetcher 等）
//   2. ThrottledSearchWrapper — 编排层：Promise 链串行化 + 熔断检查 + cap + 上游调用
//   3. ThrottledMCPServer — MCP 协议层
//   4. main() 入口

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { WrapperConfig, loadConfig } from './config';
import { CircuitBreaker } from './circuit-breaker';

// ===== 类型定义（保持原有导出契约） =====

// 与上游 duckduckgo-websearch 的 SearchResult 兼容（鸭子类型，便于测试 mock）
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

// 上游 searcher 最小契约（依赖注入，便于测试）
export interface UpstreamSearcher {
  search(query: string, options?: { maxResults?: number }): Promise<SearchResult[]>;
}

// 上游 fetcher 最小契约
export interface UpstreamFetcher {
  fetchAndParse(url: string, maxContentLength?: number): Promise<string>;
}

// 错误 code 兼容上游（BOT_DETECTED | HTTP_ERROR | TIMEOUT | UNKNOWN）+ wrapper 新增 CIRCUIT_OPEN
export type SearchErrorCode = 'BOT_DETECTED' | 'HTTP_ERROR' | 'TIMEOUT' | 'UNKNOWN' | 'CIRCUIT_OPEN';

export class SearchError extends Error {
  code: SearchErrorCode;
  blockedUntil?: Date;
  constructor(message: string, code: SearchErrorCode, blockedUntil?: Date) {
    super(message);
    this.name = 'SearchError';
    this.code = code;
    if (blockedUntil) this.blockedUntil = blockedUntil;
  }
}

// 类型守卫：从 unknown 错误中提取 code
export function getErrorCode(e: unknown): SearchErrorCode | undefined {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: unknown }).code;
    if (typeof code === 'string') return code as SearchErrorCode;
  }
  return undefined;
}

// ===== ThrottledSearchWrapper =====

export class ThrottledSearchWrapper {
  private breaker: CircuitBreaker;
  private config: WrapperConfig;

  // 串行化链：避免并发请求同时穿透熔断检查（MCP server 支持并发调用）
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private upstreamSearch: UpstreamSearcher,
    private upstreamFetch: UpstreamFetcher,
    config?: WrapperConfig,
  ) {
    this.config = config ?? loadConfig();
    this.breaker = new CircuitBreaker(this.config);
  }

  /**
   * 节流 search：串行化排队 → 熔断检查 → cap max_results → 调用上游 → 成功清空 / 失败记录
   * 失败后不做同步重试（避免双重重试放大延迟），直接抛给调用方
   */
  async search(query: string, maxResults: number = 10): Promise<SearchResult[]> {
    const run = () => this._searchImpl(query, maxResults);
    // 把 run 排到 chain 末尾；chain 自身只跟踪完成状态，吞掉错误防止断裂
    const result = this.chain.then(run);
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async _searchImpl(query: string, maxResults: number): Promise<SearchResult[]> {
    // 1. 熔断检查（状态机驱动）
    const check = this.breaker.checkAndAllow();
    if (!check.allowed) {
      throw new SearchError(
        `Circuit open: blocked until ${check.blockedUntil?.toISOString()}`,
        'CIRCUIT_OPEN',
        check.blockedUntil,
      );
    }

    // 2. 强制 cap（从根上消除 vqd 翻页连击）
    const capped = Math.min(maxResults, this.config.maxResultsCap);

    // 3. 调用上游（内部已有 3 次重试）
    //    Closed 和 HalfOpen 态的上游调用逻辑一致：
    //    - 成功 → 完全恢复（recordSuccess 清空所有状态）
    //    - BOT_DETECTED → 记录失败（状态机内部处理转换）
    //    - 其他错误 → 透传，不影响熔断状态
    const isProbe = check.state === 'half-open';
    try {
      const results = await this.upstreamSearch.search(query, { maxResults: capped });
      this.breaker.recordSuccess();
      return results;
    } catch (e) {
      if (getErrorCode(e) === 'BOT_DETECTED') {
        this.breaker.recordFailure();
      }
      throw e;
    } finally {
      if (isProbe) {
        this.breaker.completeProbe();
      }
    }
  }

  /**
   * fetch_content 透传：fetch 是独立 HTTP 通道，不受 DDG search 后端 bot detection 影响
   * 不加节流（见决策文档"不影响 #22 Browser Fetch"——fetch 层反爬是正交问题）
   */
  async fetchContent(url: string, maxContentLength: number = 8000): Promise<string> {
    return this.upstreamFetch.fetchAndParse(url, maxContentLength);
  }

  // 测试/调试用：查看当前状态（向后兼容原有返回形状）
  getState(): {
    blockedUntil: Date | null;
    recentFailures: number;
    circuitBreakCount: number;
  } {
    const snap = this.breaker.getState();
    return {
      blockedUntil: snap.blockedUntil,
      recentFailures: snap.recentFailures,
      circuitBreakCount: snap.circuitBreakCount,
    };
  }
}

// ===== MCP Server =====

class ThrottledMCPServer {
  private server: Server;
  private wrapper: ThrottledSearchWrapper;

  constructor() {
    this.server = new Server(
      { name: 'search-mcp-wrapper', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );
    // 生产环境：注入真实的上游实例
    this.wrapper = new ThrottledSearchWrapper(
      this.createUpstreamSearcher(),
      this.createUpstreamFetcher(),
    );
    this.setupToolHandlers();
  }

  // 生产环境创建上游 searcher（延迟 require，避免测试时 import 失败）
  private createUpstreamSearcher(): UpstreamSearcher {
    const { WebSearch } = require('duckduckgo-websearch');
    return new WebSearch();
  }

  private createUpstreamFetcher(): UpstreamFetcher {
    const { WebFetcher } = require('duckduckgo-websearch');
    return new WebFetcher();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search',
          description:
            'Search DuckDuckGo (throttled wrapper). max_results 强制 <= 10（禁分页，消除 vqd 连击）。连续 3 次 BOT_DETECTED 后触发指数退避熔断（30s/2min/10min）。',
          inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              query: {
                type: 'string',
                description:
                  'Search query. 支持 DDG 高级语法：site:domain / "exact phrase" / -exclude / OR / intitle: / filetype:',
              },
              max_results: {
                type: 'integer',
                description: '结果条数（默认 10，强制 cap 到 10，>10 也会被截断）',
                default: 10,
                minimum: 1,
                maximum: 10,
              },
            },
            required: ['query'],
          },
        } as Tool,
        {
          name: 'fetch_content',
          description: 'Fetch and parse webpage content（透传上游，不加节流）',
          inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              url: { type: 'string', description: '要抓取的 URL' },
              max_content_length: {
                type: 'integer',
                description: '最大返回字符数（默认 8000）',
                default: 8000,
                minimum: 1,
              },
            },
            required: ['url'],
          },
        } as Tool,
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        if (name === 'search') {
          const { query, max_results = 10 } = args as {
            query: string;
            max_results?: number;
          };
          const results = await this.wrapper.search(query, max_results);
          return {
            content: [{ type: 'text', text: this.formatResults(results) }],
          };
        } else if (name === 'fetch_content') {
          const { url, max_content_length = 8000 } = args as {
            url: string;
            max_content_length?: number;
          };
          const content = await this.wrapper.fetchContent(url, max_content_length);
          return { content: [{ type: 'text', text: content }] };
        }
        throw new Error(`Unknown tool: ${name}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = getErrorCode(error) || 'UNKNOWN';
        return {
          content: [
            {
              type: 'text',
              text: `[${code}] ${message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private formatResults(results: SearchResult[]): string {
    if (!results || results.length === 0) {
      return 'No results were found.';
    }
    const out: string[] = [`Found ${results.length} search results:\n`];
    for (const r of results) {
      out.push(`${r.position}. ${r.title}`);
      out.push(`   URL: ${r.link}`);
      out.push(`   Summary: ${r.snippet}`);
      out.push('');
    }
    return out.join('\n');
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// ===== 入口 =====

async function main(): Promise<void> {
  const server = new ThrottledMCPServer();
  await server.run();
}

// 仅在直接运行时启动 MCP server（测试 import 时不启动）
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ThrottledMCPServer };
