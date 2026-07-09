# rule-appender

L3 Capability。把人判断"值得沉淀"的经验机械追加到 `HANDOFF.md` 的"待沉淀经验"区。
**只追加,不判断**。契约见 [`../README.md`](../README.md) §五。

## 职责

- 定位 `## 待沉淀经验` section(不存在则自动追加)
- `id` 已存在 → `overwrite=false` 返回 `duplicateId`;`overwrite=true` 替换该行
- 写回文件(占用重试 3 次 × 100ms);`intent` 恒为 `"pass"`
- 失败填 `metadata.parseError`(id 非法)/ `writeError`(占用 / 权限)

## 调用示例

```typescript
import { ruleAppender } from "./rule-appender";
await ruleAppender({
  ctx: { cwd:".", gitDirtyCount:0, sessionId:"s1", startedAt:new Date().toISOString(),
    loadedRules:[], compactCount:0, recentDecisions:[], pendingTodos:[] },
  event: { type:"PostToolUse", timestamp:new Date().toISOString() },
  args: { handoffPath:"HANDOFF.md",
    experience: { id:"exp-001", content:"X 优于 Y 仅在 N≥100 时成立", source:"bench-1" } },
});
// → { intent:"pass", data:{ appended:true, targetPath:"HANDOFF.md", appendedId:"exp-001" } }
```

## 测试
```bash
node --experimental-strip-types test.ts  # Node 22.6+ type stripping
```
