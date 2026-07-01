# External Review Round 2 — Handoff 机制化基石方向

> **轮次**：第 2 轮（评审对项目方回应的回复）
> **来源**：外部评审
> **评审日期**：2026-07-01
> **回应对象**：[response-to-external-review-handoff.md](response-to-external-review-handoff.md)（项目方第 1 轮回应）
> **关联**：[external-review-handoff-foundation.md](external-review-handoff-foundation.md)（第 1 轮评审输入）
> **触发使用条件**：同第 1 轮——handoff 正式开发启动时作为参考

---

## 0. 本轮核心转折

评审在本轮**收回了一个隐含前提**：第 1 轮把 snapshot 和 handoff.md 当一个对象谈是错的，ADR-005 的拆分是对的。

但评审同时提出**比"先 snapshot 还是先 handoff"更靠前的判断**：项目方在回应材料 §4.1 设的 A/B/C 三选一题本身设错了轴——把 schema 当成**存储格式**（落在哪个文件），而五类对象（decision / change / verification / blocker / handoff）是**语义对象模型**，与载体无关。

---

## 1. 评审的反提议：单一语义对象模型 + 双投影

### 1.1 核心视角

snapshot 和 handoff.md 不是两个 schema 化候选目标，而是**同一套对象模型的两种投影**：

| | snapshot | handoff.md |
|---|---|---|
| 投影方式 | 机械投影（plugin 序列化）| 叙事投影（agent 撰写）|
| 渲染哪些对象 | decision / change / verification 的子集 | 全部五类 + 叙事 |
| confidence 来源 | **计算得出**（plugin 数 tool-call / 证据数）| **断言得出**（agent 引用 evidence-governance §4）|
| 层级 | Runtime（进漏斗）| Prompt（不进漏斗）|
| 共享什么 | **同一 ID 空间 + 同一 confidence 词汇表** | 同上 |

### 1.2 这个视角化解了什么

> snapshot 和 handoff.md **不需要同步格式，但必须共享 ID 空间和词汇表**。"基石"性不来自两份文件长得一样，而来自它们引用同一套稳定 ID——这样依赖图才能跨文件重建，而不需要第三个 `state.json`。

---

## 2. 评审对项目方"先 snapshot 后 handoff"倾向的反驳

评审给出两层反驳：

### 2.1 价值不对齐

snapshot 是窗口内 token 管理的产物，消费者是 Cline rules 注入——它再 schema 化，得到的也是一个更好的压缩工具，**不是跨 agent 协议**。基石性几乎全部存在于 handoff.md。先做 snapshot 只验证了管道（plumbing），没碰到地基。

### 2.2 环境可用性反向支持先做 handoff

项目方 §1.4 说正式开发受 codec bug 阻塞——但那阻塞的是 snapshot 的真实长对话路径。handoff.md 是人工撰写 + git 追踪的，**根本不经过 plugin runtime，不受 codec bug 影响**。

> 按"低成本"排序是 snapshot 先，但按"不被环境卡住、能立刻动"排序，反而是 handoff 先。你们用"零人工负担"论证 snapshot 优先，却忽略了 snapshot 恰恰是被 §1.15 卡得最死的那个。

### 2.3 评审的实际建议

**C 的分阶段，但第一阶段做 handoff.md 的轻量 frontmatter，而不是 snapshot**。

若项目方坚持先 snapshot，评审要求设**绊线**：snapshot schema 验收通过后，handoff schema 不得以"等 codec bug"为由无限期推迟（codec bug 不阻塞它）。否则"分阶段"会退化成"只做了管道、地基永远在路上"。

---

## 3. 评审对 Q1-Q8 的逐条回答

### Q1 / Q8：先后顺序 + 原 schema 草案是否仍适用

**原五类对象草案仍然适用，但定位要改**：不是"要不要落进某个文件"的方案，而是 snapshot 与 handoff 共同的语义底座。

> 语义对象模型先定义（这是真正的第一步，且零文件改动），之后 snapshot 和 handoff 各自序列化，不必同步格式，但必须先约定 ID 与 confidence 词汇表。

### Q2：分阶段可行性 + 第一阶段验收标准

分阶段可行。但验收标准绝不能是"snapshot 能被 rules 注入机读"——那是**机制达成（做了没）**，违反 plugin-dev-sop 的"答得上"判据。

> 第一阶段验收必须是一个**查询能不能被回答**：给一个全新 agent 只喂这份 schema 化产物，让它回答——"如果 codec bug 修复，哪些被阻塞项会自动解锁？"。它答得出依赖链，schema 才到位。

### Q3：blocker_ref 列够不够，还是要独立载体

**列方案够，且此刻优于 state.json。** 依赖图不需要独立文件存储，它是**从 blocker_ref 边即时重建**出来的。

硬前提：**blocker_ref 必须指向稳定 ID，不能指向自然语言描述**。"depends on codec bug 修复"不可遍历，`blocker_ref: §1.15-codec` 才可遍历。

### Q4：是否区分结论型 / 动作建议型

**同意区分，但不要做成两个并列字段。** 用**一个字段 + 一个 kind 判别符**：

```
lifecycle:
  kind: conclusion | action
  exit_when: "VS Code 4.0.5 release"   # conclusion 语义=失效
  exit_when: "关键词出现并确认"          # action 语义=完成
```

> 这也顺势把 §1.13 的 `expires_if_unchanged` 收编为 kind=conclusion 的特例，不必另起炉灶。

### Q5：三字段由 agent 填还是人工填

**Agent 自动填，人工可覆写。** 触发器 a 的"无条件立即产出"是约束主元——人工填当场出局。

> 这三个字段都不是新增认知负担，而是 agent 本来就在做的判断的结构化输出。30 秒约束**不受威胁**，因为没增加思考，只是换了输出格式。

### Q6：confidence 判断逻辑是否固化到 plugin

**部分固化，固化边界恰好落在 snapshot/handoff 分界上。**

- **词汇表**（高/中/低 ↔ Verified/Likely/Hypothesis）已在 evidence-governance §4，**两边都直接复用，都不进 plugin**
- **判断逻辑**：snapshot 是 plugin 生成、手里有 tool-call 记录，**可以机械计数固化进 plugin（confidence 计算得出）**；handoff.md 是 agent 的整体判断、引用 evidence-governance，**不该固化，保持 agent 断言（confidence 断言得出）**

### Q7：走 Prompt 层还是 Runtime 层

**由对象决定，不是二选一。**

- handoff.md schema = agent 行为 + dev-rules 约束 = **Prompt 层** → 不进漏斗，在 ADR-005 下加 Update
- snapshot schema = plugin 代码 = **Runtime 层** → 进漏斗，Gate 0 实际已满足（compact-observer → writeSnapshot）

> 工程量"差一个数量级"成立，但不是因为要选哪条路，而是因为**两个对象本就分属两层**。

---

## 4. 评审的收束判断

> 你们问的几乎所有"A 还是 B"（snapshot 还是 handoff、agent 填还是人工填、固化还是不固化、Prompt 还是 Runtime），在引入"**单一语义对象模型 + 双投影**"这个视角后，都从"二选一"变成"**由对象自动路由**"。这恰恰是判断一个东西够不够格当基石的试金石：**基石不是一份写得好的文档，而是一个让后续选择不再需要逐个拍脑袋的坐标系。**

> 你们现在缺的不是字段，是这个坐标系；而它几乎已经被 ADR-005、evidence-governance、mechanism-candidates 三份东西拼齐了，只差把"五类对象 + 稳定 ID + 共享词汇表"这层显式抽出来。

---

## 5. 评审的提议

评审提出可直接帮项目方出：**一份语义对象模型草案**——

- 定义 decision / change / verification / blocker / handoff 五类对象的字段
- 含 `id` 规则、`confidence` 接 evidence-governance §4、`lifecycle.kind/exit_when`、`blocker_ref` 指向稳定 ID
- 附两张投影映射表（snapshot 机械投影渲染哪些字段、handoff 叙事投影渲染哪些字段）
- 项目方拿它去对照现有 handoff.md 做一次无损映射测试

---

## 6. 评审原文（完整保留）

> 以下为外部评审原始表述，未做改写。

这份回应材料本身就是对我前一轮评审最好的反驳——它的结构化程度、对约束的显式声明、把"决策点前置于解决方案"的做法，已经在示范你们想要的那种"基石"该长什么样。所以我先收回一个隐含前提：我上轮把 snapshot 和 handoff.md 当一个对象谈，是错的，ADR-005 的拆分是对的。但正因为接受了这个拆分，我要给出一个比"先 snapshot 还是先 handoff"更靠前的判断——**你们这道二选一题本身设错了轴**。下面先讲这个，再逐条答 Q1–Q8。

### 核心反提议：schema 不该"落在"snapshot 或 handoff，而该定义在它们共同的语义层

你们在 §4.1 把 schema 化的对象拆成"snapshot / handoff.md / 各自一套"三选一，A/B/C 三个选项的弊端其实都来自同一个误设：把 schema 当成一种**存储格式**（落在哪个文件里）。但我上轮说的五类对象（decision / change / verification / blocker / handoff），从来不是存储 schema，而是**语义对象模型**——它和载体无关。

一旦这样看，snapshot 和 handoff.md 就不是两个 schema 化的候选目标，而是**同一套对象模型的两种投影**：

| | snapshot | handoff.md |
|---|---|---|
| 投影方式 | 机械投影（plugin 序列化）| 叙事投影（agent 撰写）| 
| 渲染哪些对象 | decision / change / verification 的子集 | 全部五类 + 叙事 |
| confidence 来源 | **计算得出**（plugin 数 tool-call / 证据数）| **断言得出**（agent 引用 evidence-governance §4）|
| 层级 | Runtime（进漏斗）| Prompt（不进漏斗）|
| 共享什么 | **同一 ID 空间 + 同一 confidence 词汇表** | 同上 |

这个视角直接化解了你们一半的问题：snapshot 和 handoff.md **不需要同步格式，但必须共享 ID 空间和词汇表**。"基石"性不来自两份文件长得一样，而来自它们引用同一套稳定 ID——这样依赖图才能跨文件重建，而不需要第三个 `state.json`。

下面带着这个反提议逐条答。

### Q1 / Q8：先后顺序 + 原 schema 草案是否仍适用

原五类对象草案**仍然适用，但定位要改**：它不是"要不要落进某个文件"的方案，而是 snapshot 与 handoff 共同的语义底座。所以 Q1 的"先 snapshot 还是先 handoff、要不要同步"——我的答案是：**语义对象模型先定义（这是真正的第一步，且零文件改动），之后 snapshot 和 handoff 各自序列化，不必同步格式，但必须先约定 ID 与 confidence 词汇表。**

但我要给你们的"先 snapshot 后 handoff"倾向泼一盆冷水，理由有两层：

第一，**价值不对齐**。你们的目标是"跨 agent / 跨会话的基石"。snapshot 是窗口内 token 管理的产物，消费者是 Cline rules 注入——它再 schema 化，得到的也是一个更好的压缩工具，**不是跨 agent 协议**。基石性几乎全部存在于 handoff.md。先做 snapshot 只验证了管道（plumbing），没碰到地基。

第二，**环境可用性其实反向支持先做 handoff**。你们 §1.4 说正式开发受 codec bug 阻塞——但那阻塞的是 snapshot 的真实长对话路径。handoff.md 是人工撰写 + git 追踪的，**根本不经过 plugin runtime，不受 codec bug 影响**。也就是说，按"低成本"排序是 snapshot 先，但按"不被环境卡住、能立刻动"排序，反而是 handoff 先。你们用"零人工负担"论证 snapshot 优先，却忽略了 snapshot 恰恰是被 §1.15 卡得最死的那个。

所以我的实际建议是 **C 的分阶段，但第一阶段做 handoff.md 的轻量 frontmatter，而不是 snapshot**——因为它不被阻塞、且直击基石。snapshot 的机械投影可以在 codec bug 解除后跟进。如果你们坚持先 snapshot，那必须设一个**绊线**：snapshot schema 验收通过后，handoff schema 不得以"等 codec bug"为由无限期推迟（codec bug 不阻塞它）。否则"分阶段"会退化成"只做了管道、地基永远在路上"。

### Q2：分阶段可行性 + 第一阶段验收标准

分阶段可行。但验收标准绝不能是你们写的"snapshot 能被 rules 注入机读"——那是**机制达成（做了没）**，恰恰违反你们自己写进 plugin-dev-sop 的"答得上"判据。

第一阶段的验收必须是一个**查询能不能被回答**：给一个全新 agent 只喂这份 schema 化产物，让它回答——"如果 codec bug 修复，哪些被阻塞项会自动解锁？"。它答得出依赖链，schema 才到位；答不出，说明你只是加了结构没加可用性。用这个标准，你会立刻发现 `blocker_ref` 必须指向稳定 ID（接 Q3/Q5），否则这个查询根本无法回答。

### Q3：blocker_ref 列够不够，还是要独立载体

**列方案够，且此刻优于 state.json。** 你们引 ADR-005 废弃 index.jsonl 的"自建索引与原生存储职责重叠 / 容易脱管"理由完全成立——把依赖边嵌进每 30 秒都要读的"未完成项"表，远胜一个孤儿图文件。依赖图不需要独立文件存储，它是**从 blocker_ref 边即时重建**出来的。

但有一个硬前提：**blocker_ref 必须指向稳定 ID，不能指向自然语言描述**。"depends on codec bug 修复"不可遍历，`blocker_ref: §1.15-codec` 才可遍历。所以 Q3 的答案被 Q5 锁定——没有稳定 ID，列就只是好看的文字，回答不了 Q2 的解锁查询。独立载体只在你需要**跨多文档的程序化图遍历**时才值得，现在远没到。

### Q4：是否区分结论型 / 动作建议型

**同意区分，但不要做成两个并列字段（invalidated_when / completed_when）。** 那会让 schema 长胖，违反你们"不新造枚举"的克制。它们本质是同一件事："这条目在 X 发生后不再是现状"——结论型的 X 是"现实变了"，动作型的 X 是"做完了"。

正确实现是**一个字段 + 一个 kind 判别符**：

```
lifecycle:
  kind: conclusion | action
  exit_when: "VS Code 4.0.5 release"   # conclusion 语义=失效
  exit_when: "关键词出现并确认"          # action 语义=完成
```

这样新鲜度查询只扫一个字段，渲染时按 kind 决定显示成"已失效"还是"已完成"。这也顺势把你们 §1.13 的 `expires_if_unchanged` 收编为 kind=conclusion 的特例，不必另起炉灶。

### Q5：三字段由 agent 填还是人工填

**Agent 自动填，人工可覆写。** 触发器 a 的"无条件立即产出"是这里的约束主元——人工填当场出局。但关键洞察是：**这三个字段都不是新增认知负担，而是 agent 本来就在做的判断的结构化输出**。

- `id`：纯生成，零成本。
- `confidence`：你们 handoff 里的 `H1-H4 / Verified / Likely / Hypothetical` 就是 agent 已经在下的置信判断——只是写在散文里。
- `depends_on`："Loop Guard 注入层 → 依赖 codec bug 修复"这种话你们已经在写。

所以 30 秒约束**不受威胁**，因为没增加思考，只是换了输出格式。真正的风险是格式纪律（agent 会不会漏填、ID 会不会不稳），而格式纪律恰恰是模板 / 规则能解决的。结论：agent 填，用 dev-rules §2 的模板把三字段设为 handoff 的强制结构槽位，人工保留覆写权。

### Q6：confidence 判断逻辑是否固化到 plugin

**部分固化，且固化边界恰好落在你们的 snapshot/handoff 分界上——这是个漂亮的副产物。**

要分两层：
- **词汇表**（高/中/低 ↔ Verified/Likely/Hypothesis）已在 evidence-governance §4，**两边都直接复用，都不进 plugin**。
- **判断逻辑**（几个独立证据 → 哪一档）则因载体而异：snapshot 是 plugin 生成、手里有 tool-call 记录，**可以机械计数固化进 plugin（confidence 计算得出）**；handoff.md 是 agent 的整体判断、引用 evidence-governance，**不该固化，保持 agent 断言（confidence 断言得出）**。

也就是说，"confidence 要不要固化进 plugin"这个问题的答案，由对象决定而非由你们选择——snapshot 算、handoff 断言。这正好印证了上面那张投影表。

### Q7：走 Prompt 层还是 Runtime 层

**这同样不是二选一，由对象决定，你们的漏斗自己给了答案：**

- handoff.md schema = agent 行为 + dev-rules 约束 = **Prompt 层** → 不进漏斗，不过 Gate 0/0.5。
- snapshot schema = plugin 代码 = **Runtime 层** → 进漏斗。而且 snapshot 已经有 Runtime Event 接入点（compact-observer → writeSnapshot），**Gate 0 实际上已满足**，Gate 0.5（系统问题 vs Prompt 问题）也好过——序列化产物是系统问题。

所以工程量"差一个数量级"的说法成立，但不是因为要选哪条路，而是因为**两个对象本就分属两层**。你们不需要为整个 schema 化决定层级，只需让每个对象回到它的原生层。是否触发新 ADR：handoff schema 走 Prompt 层，在 ADR-005 下加一个 Update 即可；snapshot schema 走 Runtime 层进漏斗，到 d→e 阶段时再评估是否独立 ADR。

### 把八个答案收束成一句

你们问的几乎所有"A 还是 B"（snapshot 还是 handoff、agent 填还是人工填、固化还是不固化、Prompt 还是 Runtime），在引入"**单一语义对象模型 + 双投影**"这个视角后，都从"二选一"变成"**由对象自动路由**"。这恰恰是判断一个东西够不够格当基石的试金石：**基石不是一份写得好的文档，而是一个让后续选择不再需要逐个拍脑袋的坐标系。** 你们现在缺的不是字段，是这个坐标系；而它几乎已经被 ADR-005、evidence-governance、mechanism-candidates 三份东西拼齐了，只差把"五类对象 + 稳定 ID + 共享词汇表"这层显式抽出来。

我可以直接帮你们出这版东西：**一份语义对象模型草案**——定义 decision / change / verification / blocker / handoff 五类对象的字段（含 `id` 规则、`confidence` 接 evidence-governance §4、`lifecycle.kind/exit_when`、`blocker_ref` 指向稳定 ID），并附两张投影映射表（snapshot 机械投影渲染哪些字段、handoff 叙事投影渲染哪些字段）。你们拿它去对照现有这份 handoff.md 做一次无损映射测试，就能当场看出离基石还差几个字段。要我现在出吗？

---

## 修订记录

| 日期 | 变更 | 来源 |
|------|------|------|
| 2026-07-01 | 初版归档：第 2 轮评审回复原文 + 结构化要点 | 用户转交外部评审回复 |
