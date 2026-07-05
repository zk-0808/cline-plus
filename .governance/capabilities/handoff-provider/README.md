# handoff-provider

L3 Capability — SessionStart 时聚合 `HANDOFF.md` + `snapshot.json` + `constitution.md` + `rules/*.md` 注入会话上下文。任一文件读取异常则跳过、继续其他;`intent` 永为 `inject`,缺失仅在 `metadata` 标记。

## 调用示例

```typescript
import { handoffProvider } from "./handoff-provider";
const result = await handoffProvider({
  ctx: sessionContext,
  event: { type: "SessionStart", timestamp: new Date().toISOString() },
  args: {
    handoffPath: "HANDOFF.md",
    snapshotPath: ".governance/runtime/snapshot.json",
    constitutionPath: ".governance/core/constitution.md",
    rulesDir: ".governance/rules/",
  },
});
// result.data.additionalContext 为聚合文本
```

## 测试命令

```bash
npx tsc --noEmit --strict --target es2020 --module commonjs --moduleResolution node index.ts
```

## 契约

见 `../README.md` §一(共用类型)与 §四(handoff-provider)。
