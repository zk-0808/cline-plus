# 复盘：一个 AI agent 治理框架是怎么长出来的

> 2026-06-23 起，三周主体开发 + 后续治理与审计。
> 本文只讲一条完整的故事线；每个关键点都指到仓库里可查的文档，不复述细节。

---

## 起点：agent 会失忆，也会跑偏

最初想解决的问题很具体：用 Cline 做长期项目时，**每个新会话都从零开始**。

当时手上有一个数据：任务样本里 **73% 是"续作"而非新建**（`resumed = 73%`，24/33 样本）——也就是说，绝大部分时间 agent 在处理"上一段没做完的事"，但它并不知道上一段发生了什么。

同时还有另外三类反复出现的问题：

- **目标漂移**：查一个 bug，查着查着开始重构无关模块
- **没有停止条件**：不知道"什么时候算查清了"
- **证据等级混乱**：把"猜测"和"实测"当同一件事写进结论

所以起点不是"做个框架"，而是**先让 agent 别再犯这几类错**。

> 相关：`docs/PROJECT_DEV_OUTLINE.md`（工程纪律）、`docs/dev-rules.md`（防漂移规则）

---

## 第一阶段：把搜索能力先做扎实

治理是抽象的，得先有一个具体的功能线来验证。选了**相对独立的搜索能力**——"把免费网络搜索交给 agent"。

做的方式是**双盲 A/B 对比**，前后 14 轮：

| 机制 | 结果 |
|---|---|
| P5 Gap Ledger（强制枚举证据缺口） | Gap Detection Recall **33.3% → 88.9%**，隐性缺口 +40% |
| P4 同源合并 | 逐字 Merge Precision **100%**，False Merge 0 |
| P6 提取保真 | Extractive Fidelity **92.3%** |
| P5 结构化表示 v1 | **被双盲证伪**（Conflict ID Δ −20%） |
| P5 Evidence Map | **未达阈值**（Δ+6.3% < 目标 15%） |

这一阶段真正的产出其实不是那几个机制，而是**一套可复用的评测方法**：ground truth 先密封、Run A/B 盲态独立执行、事后对比——`skills/search-orchestrator/examples/ab-test-template.md` 把这个格式固化成了模板。

之后所有争议都用这套方法来裁，包括推翻我自己喜欢的方案。

> 相关：`docs/search/search-orchestrator/survey.md`（含正反结论）、`docs/archive/search/experiments/`（38 份原始记录）

---

## 第二阶段：治理从副产品变成契约

搜索线跑起来之后，回头整理才发现：**真正被反复使用的不是某个机制，而是那些"每次都提醒自己"的规则**。

于是把它们分层，按**变更频率**而不是功能切：

| 层 | 生命周期 | 职责 |
|---|---|---|
| L1 Core | 年 / 月 | 跨项目通用宪法（≤800 token 的判定动作） |
| L2 Rules | 周 | 装好即生效的薄入口（每份 ≤50 行） |
| L3 Capability | 月 | 「怎么做」的代码模块 |
| L4 Hooks | 天 | 「什么时候调用」的事件驱动检查 |
| L5 Runtime | 每次 session | 动态状态（`HANDOFF.md`） |

关键设计是 L5：**会话交接不靠 agent 记性，靠一个必须读的文件**。新会话第一句话就是把 `constitution + HANDOFF.md + rules` 读进来，读完之前不允许动手。

**代价也记下来了**：规则本身会失控。`docs/dev-rules.md` 在 2026-06-28 到 07-02 四天内被改了 **≥8 次**（8 个 commit hash 在案）。这推动了后面加"退役判据""审查退出条件""时效模型"这些**给规则本身设的规则**。

> 相关：`docs/decisions/delivery-framework-design.md`（冻结契约）、`docs/evidence-governance.md`（证据生命周期）

---

## 第三阶段（转折）：发现自己做错了方向

这是整个项目最有价值的一段。

ADR-001 最初的判定是**复用 Cline 原生压缩**，理由是自研机制 `compaction_count = 0`——**从来没真正触发过**。

但实测推翻了"原生够用"这个前提。四项可核验依据：

1. 自研 compact `compaction_count = 0`，从未触发
2. 原生 condense 的六字段（id / kind / exit_when / confidence / depends_on / blocker_ref）**全部无结构化对应**
3. 原生 condense 语义**覆盖率 ~5%**
4. compaction 策略只有 `basic | agentic`，**没有 `off`**，CLI 也没有 `--compaction`

**但转向方式不是"推倒重来，自研一套"。**

ADR-004 → ADR-005 → ADR-006 每个只取代前者的**一部分**：ADR-005 只取代"compact 双产物"的实现方式，ADR-006 只取代"compact-observer"的实现方式，`ADR-006` 里明确写了「**不 Supersede ADR-001**」。

最终方案是**在 Cline 原生压缩的触发点上挂观察与注入**，而不是替换它。落到两条 `registerRule` 静态注入（`handoff-context` / `snapshot-context`）。

> 这段的教训是：**方向错的时候，最先该问的不是"该换成什么"，而是"原方案里哪一部分其实是对的"。**
>
> 相关：`docs/decisions/adr/`（含 supersede 链与 rolled-back 记录）、`docs/decisions/investigation/`（25 份调研记录）

---

## 第四阶段：撞上上游，然后诚实停下

框架依赖 Cline 侧的两个能力，结果两个都被上游堵住了：

| 阻塞 | 现象 | 上游状态 |
|---|---|---|
| BL-1 | VS Code 扩展 4.0.x 缺 `plugin-sandbox-bootstrap.js`，`setup()` 永不执行 | `cline/cline#11944` Open，2026-07-20 nightly 复核仍「未修复」 |
| BL-2 | CLI codec bug：`beforeModel` 注入 string content 触发 `n.content.map is not a function` | `cline/cline#12032` Open，等合并 |

处理方式不是打补丁绕过，而是：

1. 声明**不可抗力**并把触发路径查清（两条独立路径，哪条是 Verified）
2. 把注入内容改成 `ContentBlock[]` 绕开 bug
3. **等上游合并**，把"未验证"如实标成未验证

这一步没什么技术含量，但它决定了后面所有结论的可信度——**一个在受阻时仍然说清"哪里没验证"的项目，它的"已验证"才值得信。**

> 相关：`docs/dev-rules.md`（§1.15 不可抗力条款）、`docs/handoff.md`（阻塞登记）

---

## 收尾：我审计了自己的项目，并公开改错

框架写完之后，做了一次**全量文档审计**：把 204 个 markdown 分片、逐文件建档、每条结论都带 `路径:行号`，不允许凭印象写数字。

结果不太好看：

- **186 处失效的相对链接**（不是 11 处——我最初估的数字错了）
- 文档里写着"8 个 ADR / 12 个 D 决策"，实测是 **6 / 13**
- 同一个事实在 5 个文件里各写一遍；Capability 数量有 4 / 6 / 7 三个口径
- 一处被我判定为"模板污染"的地方，复查发现是**正常的模板正文**——我判错了

更关键的是：**审计自己也有 5 条结论被后续整改证伪**，包括上面那条误判。我把这 5 条全部记录在案，没有删。

> 一个项目的可靠性，不体现在它没犯过错，而体现在**它犯错之后留下了什么**。
>
> 相关：`docs/RETROSPECTIVE-AUDIT.md`（审计方法与纠错记录）

---

## 如果只看三份文档

| 想看什么 | 去哪 |
|---|---|
| 判断过程（含被推翻的决策） | `docs/decisions/adr/` — 从 ADR-001 按时间读到 ADR-007 |
| 量化结论（含被证伪的） | `docs/search/search-orchestrator/survey.md` — 14 轮双盲 A/B 汇总 |
| 审计与自我纠错 | `docs/RETROSPECTIVE-AUDIT.md` |

---

## 现状

**能做**：CLI 端全链路已实测通过（plugin 加载 → hook 触发 → rule 注入 → messageBuilder 注入）。
**不能做**：VS Code 端因上游 issue #11944 完全不可用；长对话压缩实测因 PR #12032 阻塞。
**没验证**：Core Constitution 的跨项目通用性（只在 2 个项目 dogfood 过）。

这三条同时写在 `README.md` 的「已知局限」里——**不会因为放在复盘里就说得更好听。**
