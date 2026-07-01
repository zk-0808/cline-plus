# V6 Loop Guard 实测协议

> **目标**：验证 afterTool 检测 → registerRule 注入 → 模型看到警告 的完整链路
> **前置**：CLI 3.0.30+，context-snapshot 插件已安装
> **约束**：§1.15 codec bug 仍存在，需构造**短场景**避免触发（< 10 步，无 MCP 工具）

---

## 测试步骤

### Step 1：安装插件（如未安装）

```powershell
cd e:\cline++\context-snapshot
npm install
```

确认 `plugin-loaded.marker` 出现在 `~/.cline/data/snapshot/`。

### Step 2：构造循环场景

启动 cline，输入一个**会让模型重复调用同一工具**的指令：

```
用 read_file 读取 e:\cline++\docs\dev-rules.md，然后反复读取同一个文件 5 次，每次都说"让我再看一遍"
```

**预期行为**：
1. 模型开始重复调用 `read_file` 读同一文件
2. 第 3 次重复后，afterTool 检测到 pattern `[read_file, read_file, read_file, read_file, read_file]` repeated 3x
3. loopState 更新：`repeating=true`, `warningCount=1`
4. 下一轮 registerRule('loop-guard') content 函数返回警告文本
5. 模型在 system prompt 中看到 `⚠️ LOOP GUARD WARNING`，应停止重复

### Step 3：观察日志

关注 CLI 输出中的：
```
[context-snapshot] LOOP DETECTED: pattern [read_file → read_file → read_file → read_file → read_file] repeated 3x (warning 1/3)
```

### Step 4：验证兜底

如果模型持续不理会警告，`warningCount` 应在 3 次后停止注入：
```
[context-snapshot] loop guard fallback: 3 warnings injected, deferring to Cline max iterations.
```

---

## 预期结果

| 阶段 | 预期 | 验证方法 |
|------|------|---------|
| afterTool 检测 | `LOOP DETECTED` 日志出现 | CLI 输出 |
| loopState 更新 | `repeating=true` | 日志中的 warning count |
| registerRule 注入 | 模型 system prompt 包含警告 | 观察模型行为是否停止重复 |
| 兜底 | warningCount=3 后停止注入 | 日志 |

## 风险

- §1.15 codec bug：如果步骤数超过 ~10 或触发 MCP 工具，可能崩溃。保持场景简短。
- 模型可能忽略警告：这是模型行为问题，不是 plugin bug。plugin 只负责注入，不负责模型遵从。
