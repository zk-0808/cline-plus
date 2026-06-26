# P5 Capability Spike — CLI 实跑说明

## 前置条件

- Node.js >= 18
- npm 可用
- 本目录含 `p5-spike-plugin.ts`（已改造的 plugin）

## Phase 2: CLI 实跑验证步骤

### 步骤 1: 全局安装 Cline CLI

```bash
npm i -g cline
```

验证安装：
```bash
cline --version
```

### 步骤 2: 安装 Spike plugin

```bash
cline plugin install ./p5-spike-plugin.ts --cwd .
```

验证 plugin 加载：
```bash
cline config
```
检查 plugin tab 是否显示 `p5-spike-compaction`。

### 步骤 3: 实跑触发 compact

需要一个足够长的对话来触发 compact（token > 120000 * 0.75 = 90000）。

```bash
cline -i "请详细分析 TypeScript 的类型系统，包括泛型、条件类型、映射类型、infer 关键字、模板字面量类型，并给出每个特性的示例代码。然后分析 React 18 的并发特性，包括 Suspense、useTransition、useDeferredValue。最后分析 Node.js 的事件循环模型。"
```

> 注意：单个 prompt 可能不足以触发 compact。可能需要多轮对话。如果一次不触发，可以继续追问细节问题直到 token 累积到阈值。

### 步骤 4: 检查产物

```bash
# 检查 handoff.md 是否生成
cat handoff/handoff.md

# 检查 index.jsonl 是否追加
cat handoff/index.jsonl

# 检查 session-start.log（#6 验证）
cat handoff/session-start.log
```

### 步骤 5: 记录结果

将实跑结果填入 `run-p5-capability-spike.md` §5 实跑记录表。

## Go/No-Go 判定

### Go（全部满足）

1. `cline config` 显示 plugin 已加载
2. compact 触发后 `handoff/handoff.md` 生成
3. compact 触发后 `handoff/index.jsonl` 追加一条记录
4. `handoff/session-start.log` 有记录（#6，若跑不通则降级，不影响 #5 Go 判定）

### No-Go（满足任一）

- `cline plugin install` 失败（API 无法稳定实现）
- plugin 加载后 `registerMessageBuilder` 未触发（SDK 不支持）
- compact 触发但 handoff/index 未生成（闭环断裂）
- SDK 适配需大量侵入修改（修改量超预期）

## 故障排查

| 问题 | 排查方向 |
|------|---------|
| `cline plugin install` 报错 | 检查 `@cline/core` / `@cline/shared` 依赖是否由 host 提供 |
| plugin 加载但 compact 未触发 | 对话 token 未达阈值（90000），需更长对话 |
| compact 触发但文件未生成 | 检查 cwd 权限，`handoff/` 目录是否可创建 |
| session_start hook 未触发 | `beforeRun` 可能不是 session_start 的对应处理器，尝试 `onEvent` |

## 产物清单

| 文件 | 说明 |
|------|------|
| `p5-spike-plugin.ts` | 改造后的 plugin（registerMessageBuilder + handoff + index + session_start hook） |
| `run-p5-capability-spike.md` | Spike 框架文档（designated_executor + Go/No-Go + 执行步骤） |
| `README.md` | 本文件（CLI 实跑说明） |
| `handoff/` | 实跑产物目录（handoff.md + index.jsonl + session-start.log） |
