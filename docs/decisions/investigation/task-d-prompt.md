# Task D: cline 原生 condense 实测验证

> **前置条件**：A/B/C 子代理已完成，综合报告见 `investigation-note-native-condense-synthesis.md`
> **执行方式**：用户在真实终端执行（dev-rules §1.2：cline 交互式会话需真实终端）
> **目的**：验证 A/B/C 的源码分析结论，看实际 condense 产物形态

## 步骤

### 1. 确保 cline 已安装

```bash
cline --version
```

应输出 `3.0.34` 或更高版本。

### 2. 创建一个短对话测试

在真实终端执行：

```bash
cline -i
```

进入交互式会话后，发送以下内容（分多次发送，制造多轮对话）：

**第 1 轮**：
```
请帮我创建一个文件 test-compact.md，内容是"# Test"，然后读取它确认内容正确。
```

**第 2 轮**：
```
现在把 test-compact.md 的内容改成 "## Updated"，再读取确认。
```

**第 3 轮**：
```
总结一下我们刚才做了什么，列出所有文件操作。
```

**第 4 轮**（触发 compaction）：
```
请帮我写一个 Python 脚本 fibonacci.py，计算斐波那契数列前 20 项并打印结果。运行它确认正确。
```

### 3. 手动触发 compaction

在会话中执行：

```
/compact
```

或：

```
/smol
```

### 4. 观察 compaction 后的行为

compaction 完成后，发送：

```
我们之前做了哪些文件操作？请列出所有修改过的文件路径。
```

观察：
- cline 是否还记得 `test-compact.md` 和 `fibonacci.py`？
- 它是否记得具体的修改内容（"## Updated"）？
- 它是否记得决策链（先创建→再修改→再总结）？

### 5. 记录结果

将观察结果记录到 `cline-plus/docs/decisions/investigation/investigation-note-native-condense-d-test.md`，格式：

```markdown
# Investigation Note: Native Condense 实测验证 (Task D)

## 1. 测试环境
- cline 版本：
- compaction 策略（basic/agentic）：
- 测试时间：

## 2. compaction 前的对话摘要
（简要记录对话内容）

## 3. compaction 触发方式
（/compact / /smol / 自动触发）

## 4. compaction 后的观察
（cline 是否记得文件操作？是否记得具体内容？是否记得决策链？）

## 5. 与 A/B/C 源码分析的对照
（实测结果是否印证了源码分析的结论？）

## 6. 结论
（原生 condense 丢失了什么？保留了什么？是否足以支持 handoff？）
```

## 关注点

1. **agentic 模式下**：观察摘要是否包含 Goal/State/Highlights/Next 结构
2. **文件路径保留**：`readFiles`/`modifiedFiles` 是否准确
3. **语义丢失**：决策链、置信度、依赖关系是否丢失
4. **Focus Chain**：todo list 是否穿越 compaction

## 预期结果（基于 A/B/C 分析）

- ✅ 文件路径可能保留（`readFiles`/`modifiedFiles`）
- ⚠️ 文件内容细节可能丢失（被摘要为"修改了 test-compact.md"）
- ❌ 决策链丢失（不知道为什么改、改了几次）
- ❌ 置信度丢失
- ❌ 依赖关系丢失
