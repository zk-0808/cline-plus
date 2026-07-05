# Hook Definitions — L4 事件驱动检查

> **生命周期**：版本绑定 — v1.0 框架定型后归档,后续变更走 ADR。
>
> **身份**：4 个 Hook 的综合设计文档——回答"什么时候调用"。
>
> **正交原则**：Hook 决定**时机**,Capability 决定**执行**。Hook 调用 Capability 拿 intent 后,自身决定动作(pass/block/inject)。
>
> **加载机制**：Cline Hooks 生命周期自动触发。

---

## 一、Hook 总览

| Hook | 生命周期事件 | 调用 Capability | 默认 intent | 阻塞状态 |
|------|------------|---------------|------------|---------|
| `session-start` | SessionStart | handoff-provider / git-checker | inject | CLI 端可跑 |
| `pre-tool` | PreToolUse | git-checker | pass/block | CLI 端可跑 |
| `post-tool` | PostToolUse | (未来) rule-appender | pass | 占位,无可跑 Capability |
| `pre-compact` | PreCompact | snapshot-writer | pass | 受 BL-2 阻塞实测 |

---

## 二、session-start Hook

### 职责

会话启动时:
1. 调用 `handoff-provider` 读取 HANDOFF.md + snapshot.json + constitution + rules/,注入到 additionalContext
2. 调用 `git-checker` 检测当前 dirty count,注入到 additionalContext(让 AI 感知工作目录状态)

### 配置

```typescript
interface SessionStartHookConfig {
  enabled: boolean;
  capabilities: {
    handoffProvider: {
      enabled: boolean;
      args: {
        handoffPath: string;          // 默认 "HANDOFF.md"
        snapshotPath: string;         // 默认 ".governance/runtime/snapshot.json"
        constitutionPath: string;    // 默认 ".governance/core/constitution.md"
        rulesDir: string;             // 默认 ".governance/rules/"
      };
    };
    gitChecker: {
      enabled: boolean;
      args: {
        threshold: number;            // 来自 constitution 项目可调参数
        excludePatterns?: string[];
      };
    };
  };
}
```

### 执行流程

```
SessionStart 事件触发
  ↓
1. 构造 SessionContext(cwd / sessionId / startedAt / gitDirtyCount / ...)
  ↓
2. 调用 handoff-provider → 获取 inject intent + additionalContext
  ↓
3. 若 gitChecker.enabled → 调用 git-checker → 获取 inject intent + dirtyCount
  ↓
4. 聚合 additionalContext(handoff 内容 + git 状态)
  ↓
5. 返回 Cline: { additionalContext: <聚合文本> }
  ↓
6. Cline 把 additionalContext 注入到会话上下文
```

### 失败处理

- handoff-provider 失败 → 跳过,记录到日志,不阻断会话启动
- git-checker 失败(非 git 仓库)→ 跳过 git 段
- 任一 Capability 抛异常 → 跳过该 Capability,继续其他

---

## 三、pre-tool Hook

### 职责

每次工具调用前:
1. 调用 `git-checker` 检测未 commit 文件堆积
2. 若达阈值 → block,取消工具调用,提示 AI 先 commit 或写 HANDOFF.md

### 配置

```typescript
interface PreToolHookConfig {
  enabled: boolean;
  capabilities: {
    gitChecker: {
      enabled: boolean;
      args: {
        threshold: number;            // 默认 constitution.uncommitted_file_threshold
        excludePatterns?: string[];
      };
    };
  };
  // 可选: 工具名白名单(不检测的工具)
  skipTools?: string[];               // 如 ["read_file", "list_dir"]
}
```

### 执行流程

```
PreToolUse 事件触发
  ↓
0. 若 toolName ∈ skipTools → 直接 pass
  ↓
1. 构造 HookEvent({ type: "PreToolUse", toolName, toolArgs })
  ↓
2. 调用 git-checker → 获取 intent
  ↓
3. 判断 intent:
   - pass  → 允许工具调用
   - block → 取消工具调用,返回 reason 给 AI
   - inject→ 注入 dirtyCount 到 additionalContext(让 AI 感知),仍允许工具调用
```

### 阻断理由模板

```text
未 commit 文件堆积 ≥ <N>,触发 handoff 写入门控(constitution §4 触发器 b)。
请先执行:
  1. git commit 现有改动,或
  2. 写 HANDOFF.md 后 commit,或
  3. 显式确认继续推进(用户明确要求时)
```

### 失败处理

- git-checker 失败 → 默认 pass(不阻断——避免非 git 仓库误伤)
- 工具调用是 git 操作本身(git commit / git add)→ 跳过检测,避免循环

---

## 四、post-tool Hook(占位)

### 职责

每次工具调用后:
- **本次交付**:纯占位,无可跑 Capability
- **未来**:调用 `rule-appender` 自动判断经验沉淀(等 BL-1 解除后接入)

### 配置

```typescript
interface PostToolHookConfig {
  enabled: boolean;
  capabilities: {
    // 本次交付:空
    ruleAppender?: {
      enabled: false;                // 未来接入
      args: {
        handoffPath: string;
        // 自动判断触发条件(待设计)
      };
    };
  };
  // 可选: 用户自加的 lint / test 检查
  customChecks?: Array<{
    name: string;
    run: (ctx: SessionContext, event: HookEvent) => Promise<void>;
  }>;
}
```

### 执行流程

```
PostToolUse 事件触发
  ↓
1. 遍历 customChecks,依次执行
  ↓
2. (未来)调用 rule-appender 判断是否值得沉淀
  ↓
3. 返回 Cline: 无干预
```

### 用户自加示例

```typescript
// 用户可在 post-tool 加 lint 检查
customChecks: [{
  name: "eslint",
  run: async (ctx, event) => {
    if (event.toolName === "write_file" && event.toolArgs?.path.endsWith(".ts")) {
      const result = await exec("npx eslint --fix " + event.toolArgs.path);
      if (result.exitCode !== 0) {
        console.warn("ESLint warnings:", result.stdout);
      }
    }
  }
}]
```

---

## 五、pre-compact Hook

### 职责

会话上下文压缩前:
1. 调用 `snapshot-writer` 把会话关键状态(decisions / pendingTodos / files_changed / next_actions)写入 snapshot.json
2. 写入后 pass,允许 compact 继续

### 配置

```typescript
interface PreCompactHookConfig {
  enabled: boolean;
  capabilities: {
    snapshotWriter: {
      enabled: boolean;
      args: {
        snapshotPath: string;         // 默认 ".governance/runtime/snapshot.json"
        extractors: SnapshotExtractor[];
      };
    };
  };
}
```

### 执行流程

```
PreCompact 事件触发
  ↓
1. 构造 SessionContext(含 recentDecisions / pendingTodos / compactCount)
  ↓
2. 调用 snapshot-writer → 写 snapshot.json
  ↓
3. 接收 intent=pass(永不阻断 compact)
  ↓
4. 返回 Cline: 允许 compact 继续
  ↓
(下次 SessionStart 时,session-start hook 调用 handoff-provider 读取 snapshot.json 注入)
```

### 失败处理

- snapshot-writer 写入失败 → pass + 日志(不阻断 compact——compact 必须执行,否则会话卡死)
- 提取器抛异常 → 跳过该字段,继续其他字段
- snapshot.json 损坏 → 覆盖写(不读旧值)

---

## 六、Hook 优先级与冲突

当多个 Hook 同时配置时,执行顺序:

```
SessionStart → PreToolUse → PostToolUse → PreCompact
        ↓          ↓             ↓           ↓
     inject     pass/block      pass        pass
```

**冲突处理**:
- 多个 Capability 在同一 Hook 返回不同 intent → 取最严格(block > inject > pass)
- 同一 Capability 被多 Hook 调用 → 各 Hook 独立调用,Capability 无状态(纯函数)

---

## 七、实现状态

| Hook | 设计 | CLI 实现 | VS Code 实现 |
|------|:---:|:---:|:---:|
| session-start | ✓ 完成 | 部分(handoff-provider 待实现) | 阻塞(BL-1) |
| pre-tool | ✓ 完成 | git-checker 可跑 | 阻塞(BL-1) |
| post-tool | ✓ 占位 | 占位 | 阻塞(BL-1) |
| pre-compact | ✓ 完成 | snapshot-writer 待实现 | 阻塞(BL-1) |

**后续实现优先级**:
1. session-start 的 handoff-provider(无阻塞,纯文件读取)
2. pre-compact 的 snapshot-writer(需 BL-2 解除后实测)
3. post-tool 的 rule-appender(等 BL-1 解除)

---

## 八、Hook 配置文件示例

框架提供 `.governance/hooks/config.json` 作为配置入口(用户可改):

```json
{
  "session-start": {
    "enabled": true,
    "capabilities": {
      "handoffProvider": {
        "enabled": true,
        "args": {
          "handoffPath": "HANDOFF.md",
          "snapshotPath": ".governance/runtime/snapshot.json",
          "constitutionPath": ".governance/core/constitution.md",
          "rulesDir": ".governance/rules/"
        }
      },
      "gitChecker": {
        "enabled": true,
        "args": {
          "threshold": 5,
          "excludePatterns": ["node_modules/", "dist/", ".git/"]
        }
      }
    }
  },
  "pre-tool": {
    "enabled": true,
    "skipTools": ["read_file", "list_dir"],
    "capabilities": {
      "gitChecker": {
        "enabled": true,
        "args": {
          "threshold": 5,
          "excludePatterns": ["node_modules/", "dist/", ".git/"]
        }
      }
    }
  },
  "post-tool": {
    "enabled": false,
    "customChecks": []
  },
  "pre-compact": {
    "enabled": true,
    "capabilities": {
      "snapshotWriter": {
        "enabled": true,
        "args": {
          "snapshotPath": ".governance/runtime/snapshot.json",
          "extractors": ["decisions", "todos", "files_changed", "next_actions"]
        }
      }
    }
  }
}
```

---

## 引用

- Capability 接口契约:[`../capabilities/README.md`](../capabilities/README.md)
- 框架目录契约:[`../../docs/decisions/delivery-framework-design.md`](../../docs/decisions/delivery-framework-design.md)
- 触发器定义:[`../core/constitution.md` §4](../core/constitution.md)
- handoff 机制:[`../rules/handoff-entry.md`](../rules/handoff-entry.md)
