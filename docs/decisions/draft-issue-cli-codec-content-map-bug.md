# Draft: GitHub Issue — `agent-message-codec.ts` crashes on non-array `content` (long conversations / MCP tool_result)

> **Status**: Draft — 待用户确认后提交到 github.com/cline/cline/issues
> **表单来源**: https://github.com/cline/cline/issues/new?template=bug_report.yml
>
> **关联**：[investigation-note-cli-codec-content-map-bug.md](investigation-note-cli-codec-content-map-bug.md) — 完整证据链

---

## 表单字段

### Title *

```
CLI 3.0.34 crashes with `n.content.map is not a function` after long conversations / large MCP tool_result
```

### Cline Surface *

```
CLI
```

### Cline Version *

```
3.0.34
```

### Beta version

不勾选

### What happened? *

```
After a long-running CLI session (high token usage) or after a large/structured MCP `tool_result`, the CLI crashes with:

    Error: n.content.map is not a function. (In 'n.content.map(eK)', 'n.content.map' is undefined)

The error originates in `sdk/packages/core/src/runtime/config/agent-message-codec.ts`, in `agentMessageToMessageWithMetadata` (minified as `afi`) and `agentMessagesToMessages` (minified as `Nd`). Both functions call `i.content.map(...)` without an `Array.isArray(i.content)` guard, assuming `content` is always an array.

Reproduced three times in a single session:
1. After a `duckduckgo__search` MCP call timed out
2. After `run_commands` returned 843+ lines
3. After `read <directory>` returned a directory listing

All three crashes occurred immediately after a tool returned, while the codec was transforming the message history.

## Facts

**Fact 1**: `agentMessageToMessageWithMetadata` and `agentMessagesToMessages` call `.content.map()` with no guard:

```ts
// sdk/packages/core/src/runtime/config/agent-message-codec.ts (~L78, L97)
function agentMessageToMessageWithMetadata(i) {
  let e = i.content.map(eK).filter(n => n !== void 0);
  return { id: i.id, role: i.role === "tool" ? "user" : i.role, content: e, ... };
}

function agentMessagesToMessages(i) {
  let e = [];
  for (let n of i) {
    let t = n.content.map(eK).filter(r => r !== void 0);  // ← crashes here when content is not an array
    ...
  }
}
```

**Fact 2**: Other `.content.map(...)` call sites in the same bundle **do** have guards, showing the pattern is known:

```js
// Guarded call site (e.g. in truncation / media-budget code)
if (!Array.isArray(a.content)) return {...a};
return {...a, content: a.content.map(...)};

// Another guarded call site
if (i.type !== "tool_result" || typeof i.content === "string") return i;
... a = i.content.map(...) ...
```

`agentMessageToMessageWithMetadata` / `agentMessagesToMessages` are missing this guard.

**Fact 3**: `MessageBuilder.buildForApi()` in `message-builder.ts` (different module) already handles non-array `content` correctly, which is why the crash doesn't always happen — only when messages flow through the codec path without going through `MessageBuilder`.

**Fact 4**: Error format `(In '...', '...' is undefined)` is JavaScriptCore (JSC) format. The CLI binary (`@cline/cli-windows-x64`) is a Bun-compiled binary (resolver comment: "compiled binary has Bun embedded"), and Bun uses JSC — matching the observed error format.

## Reproduction

```bash
cline -i
# Then perform a long conversation that accumulates ≥90K tokens of history,
# or trigger an MCP tool that returns a large/structured tool_result.
# Crash occurs when codec attempts to transform the message history.
```

Minimal reproduction (unverified — would need a controlled MCP server returning `content: "string"` instead of `content: [...]`):

```
# Hypothetical MCP tool_result that triggers the bug:
{
  "role": "tool",
  "content": "some string instead of an array"  // ← triggers the crash
}
```

## Suggested Fix

Add `Array.isArray` guard at the entry of both functions, matching the pattern already used by other call sites:

```ts
// In agentMessageToMessageWithMetadata:
function agentMessageToMessageWithMetadata(i) {
  // Guard: normalize non-array content to array form
  const content = Array.isArray(i.content)
    ? i.content
    : typeof i.content === "string"
      ? [{ type: "text", text: i.content }]
      : [];
  const e = content.map(agentPartToContentBlock).filter(n => n !== void 0);
  return { id: i.id, role: i.role === "tool" ? "user" : i.role, content: e, ... };
}

// In agentMessagesToMessages:
function agentMessagesToMessages(i) {
  const e = [];
  for (const n of i) {
    // Same guard as above
    const content = Array.isArray(n.content)
      ? n.content
      : typeof n.content === "string"
        ? [{ type: "text", text: n.content }]
        : [];
    const t = content.map(agentPartToContentBlock).filter(r => r !== void 0);
    ...
  }
}
```

## Suggested Test Cases

```ts
describe("agentMessageToMessageWithMetadata / agentMessagesToMessages", () => {
  // Existing array-content case (already passing)
  it("handles array content", () => { ... });

  // Missing cases — added to prevent regression:
  it("handles string content (normalizes to [{type:'text', text}])", () => {
    const msg = { role: "user", content: "hello" };
    expect(() => agentMessageToMessageWithMetadata(msg)).not.toThrow();
  });

  it("handles null content (normalizes to [])", () => {
    const msg = { role: "user", content: null };
    expect(() => agentMessageToMessageWithMetadata(msg)).not.toThrow();
  });

  it("handles object content (non-array, non-string — normalizes to [])", () => {
    const msg = { role: "user", content: { unexpected: true } };
    expect(() => agentMessageToMessageWithMetadata(msg)).not.toThrow();
  });

  it("handles tool message with string content (common MCP case)", () => {
    const msg = { role: "tool", content: "tool output as string" };
    expect(() => agentMessageToMessageWithMetadata(msg)).not.toThrow();
    const result = agentMessageToMessageWithMetadata(msg);
    expect(result.role).toBe("user");
    expect(result.content[0]).toEqual({ type: "text", text: "tool output as string" });
  });
});
```

## Impact

- Blocks long-running CLI sessions (any session approaching context limits triggers the codec path)
- Blocks MCP-heavy workflows (any MCP tool returning non-array `content` triggers the bug)
- Workaround: none reliable (limiting conversation length reduces but does not eliminate the risk)

## Environment

- OS: Windows 10
- Cline: 3.0.34 (CLI, `@cline/cli-windows-x64`)
- Install method: `npm i -g cline`
- Runtime: Bun-compiled binary (JSC error format)
- Plugin system: N/A (no plugins involved in reproduction)

### Bug Report

```
Error: n.content.map is not a function. (In 'n.content.map(eK)', 'n.content.map' is undefined)
    at Nd (<cline.exe bundle>)
    at <caller>
    ...
```

(Minified stack trace — symbolicated: `Nd` = `agentMessagesToMessages`, `eK` = `agentPartToContentBlock`)
