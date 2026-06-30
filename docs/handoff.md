# Handoff — v0.6.0 重构完成：ADR-005 命名落地 + P0 Snapshot Writer + P1 修复

## 本会话决策

| 决策 | 状态 |
|------|------|
| 3-pass 子代理全量审查（架构 / 逻辑 / 设计一致性）| ✅ 发现 16 问题 |
| ADR-005 命名全面落地：handoff → snapshot | ✅ 源码零残留 |
| P0 修复：snapshot-writer.ts 实现（5 节模板 + 磁盘写入）| ✅ |
| P1 修复：统一路径 / Loop Guard 兜底 / beforeModel meta marker / afterTool LIFO | ✅ |
| 死代码清理 ~90 行 | ✅ |
| TypeScript 编译零错误 | ✅ |
| VS Code 扩展 4.0.x 不支持插件（回滚到 3.89.2 pre-SDK）| ✅ 已确认 |
| CLI 3.0.30+ 是当前唯一可用插件运行环境 | ✅ 已确认 |
| GitHub issue #11944 待跟进 | ⬜ |

## 本会话净变化

### 1. 3-Pass 代码审查

| Pass | 审查维度 | 核心发现 |
|------|---------|---------|
| Pass 1 | 架构 | 死代码 ~90 行、路径定义重复、PLUGIN_NAME 不一致 |
| Pass 2 | 逻辑 | afterTool 并发匹配 FIFO 错误、beforeModel 误判风险、空 catch |
| Pass 3 | 设计一致性 | ADR-005 命名对齐度 20%、snapshot 写入是死代码、Loop Guard 无兜底 |

### 2. 全量重构（v0.5.0 → v0.6.0）

**重命名**（全部 5 源文件）：
- `PLUGIN_NAME`: `"auto-handoff"` → `"context-snapshot"`
- 输出目录: `~/.cline/data/handoff/` → `~/.cline/data/snapshot/`
- 12+ 处函数/变量名: `*Handoff*` → `*Snapshot*`
- Rule 名: `handoff-context` → `snapshot-context`
- package name: `handoff-plugin` → `context-snapshot`

**新模块**：
- `constants.ts`（10 行）— 统一定义 `PLUGIN_NAME` + `getSnapshotDir()`
- `snapshot-writer.ts`（213 行）— P0 核心功能：5 节模板生成 + 磁盘写入
  - 模板：会话标题 / 决策表 / 净变化 / 未完成项表 / 权威源
  - compact-observer 在 `needsCompact=true` 时调用 `writeSnapshot()`

**P1 修复**：
- Loop Guard：`MAX_LOOP_WARNINGS=3`，超过后停止注入，交由 Cline max iterations
- beforeModel：`__plugin_loop_warning__` meta marker 替代字符串匹配
- afterTool：LIFO 搜索 + pending ID 随机后缀，修复并发匹配
- 错误处理：所有 catch 块添加 `console.error`，消除空 catch

**清理**：
- 移除 `generateHandoffContent()`、`writeHandoff()`、`getHistory()`、`getSlowCalls()`
- 移除 `SnapshotOptions`、tool-recorder 死导入、`DURATION_WARN_MS`
- 净变化：-52 行（91 增 / 143 删）

**基础设施**：
- 安装 `@types/node` + `typescript` 作为 devDependencies
- 创建 `@cline/core` + `@cline/shared` 类型声明 stub
- tsconfig.json: `types: ["node"]` + `paths` 映射

### 3. 不可抗力声明（上轮完成，本轮保留）

已写入 3 个活跃决策文档：
- `docs/plugin/design.md` — 证据链表格（v4.0.0→v4.0.1→v4.0.2→issue #11944→CLI 3.0.33）
- `docs/plugin/mechanism-landing-assessment.md` — 运行时约束声明
- `docs/dev-rules.md` — §1.15 执行环境可用性门控

### 4. CLI 验证结果（上轮完成，本轮保留）

| 验证项 | 结果 |
|--------|------|
| setup() 执行 | ✅ marker 文件写入 |
| messageBuilder.build() 调用 | ✅ 每 turn 执行 |
| compact 检测 | ✅ shouldCompact 返回 needsCompact=true |
| token 估算 bug 修复 | ✅ Math.ceil(text.length/4) + default case JSON.stringify |
| beforeModel 实测 | ⬜ 待构造循环场景 |
| rules 注入实测 | ⬜ 待新 session 验证 |
| snapshot 文件写入实测 | ⬜ 待长对话触发 compact |

## 产出文件

| 文件 | 变更 |
|------|------|
| `handoff-plugin/src/constants.ts` | 🆕 共享常量 |
| `handoff-plugin/src/snapshot-writer.ts` | 🆕 P0 snapshot 生成 + 写入 |
| `handoff-plugin/src/index.ts` | 重写：接入 snapshot writer + Loop Guard 兜底 + meta marker |
| `handoff-plugin/src/rules-injector.ts` | 重写：全量重命名 + 统一路径 |
| `handoff-plugin/src/tool-recorder.ts` | 清理：移除死代码 + LIFO 匹配 |
| `handoff-plugin/src/types.ts` | 清理：移除 SnapshotOptions |
| `handoff-plugin/package.json` | 重命名 + devDeps |
| `handoff-plugin/tsconfig.json` | types + paths 配置 |
| `docs/handoff.md` | 本文件 |

## Commits

### 本会话新增

| Hash | Repo | Message |
|------|------|---------|
| `565968a` | handoff-plugin | refactor: ADR-005 full rename + P0 snapshot writer + P1 bug fixes |
| `16b6660` | cline++ (parent) | chore: update handoff-plugin to context-snapshot v0.6.0 |

### 历史（上轮）

| Hash | Repo | Message |
|------|------|---------|
| `6db3a68` | handoff-plugin | fix: token estimation bugs in compact-observer |
| `8e10507` | cline++ | verify: CLI plugin chain verified + token estimation bugs fixed |
| `623d700` | cline++ | docs: add force majeure declaration — VS Code ext 4.0.x plugin unavailable |

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **CLI 实测 snapshot 写入** | 长对话触发 compact → 验证 `~/.cline/data/snapshot/` 产出文件 | 🔴 高 |
| **CLI 实测 Loop Guard 兜底** | 构造循环场景 → 验证 3 次警告后停止注入 | 🔴 高 |
| **CLI 实测 rules 注入** | 新 session 启动 → 验证读历史 snapshot 注入 system prompt | 🟡 中 |
| **README.md 同步** | ~15 处 handoff 引用待更新 | 🟢 低 |
| **GitHub issue #11944 跟进** | 等作者回复 SDK 迁移时间线 | 🟡 中 |
| **design.md §3.3.2 标注废弃** | index.jsonl 已被 ADR-005 废弃，文档未标注 | 🟢 低 |
| **Snapshot 模板精度迭代** | 当前决策/未完成项提取基于简单正则，精度有限 | 🟢 低 |

## 权威源

[dev-rules.md](dev-rules.md) · [design.md](plugin/design.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) · [investigation-note-cli-plugin-verification.md](decisions/investigation-note-cli-plugin-verification.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.15 不可抗力门控）与 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：context-snapshot plugin v0.6.0 重构完成，ADR-005 命名落地，P0 snapshot writer 实现，TypeScript 编译零错误。CLI 3.0.30+ 是唯一可用运行环境。

**下次首要动作**：
1. **CLI 实测 snapshot 写入**：`cline -i` 跑长对话 → 检查 `~/.cline/data/snapshot/` 是否产出 snapshot 文件
2. **CLI 实测 Loop Guard**：构造重复工具调用场景 → 验证兜底计数生效
3. **同步已装插件**：`cp handoff-plugin/src/* ~/.cline/plugins/installed/local/context-snapshot/src/`
