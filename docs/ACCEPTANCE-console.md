# 本地控制台与治理门禁：验收清单

> **生命周期**：任务绑定 — 本轮（P0/P1）验收通过后删除或并入复盘。
>
> **用途**：把 2026-10-17 这一轮（commit `5a216c0..` 至今）的交付物摊开成可逐条核对的清单。每条都给**验证命令**与**预期输出**，不要求读者信任叙述。

---

## 一、怎么跑起来

```powershell
node governance-console/server.mjs --port 7717 --repo .
```

终端会打印带 token 的地址；不带 token 打开会被 403（这是设计，不是故障）。

| 页面 | 地址后缀 |
|---|---|
| 控制台（开关 / 一键安装 / 变更批次） | `/` |
| 健康面板 | `/?view=health` |
| 规则视图 / 条款索引 | `/?view=docs` / `/?view=clauses` |
| 审计纸本外观 | 再加 `&theme=paper` |

## 二、自动化验证（这一节是硬的）

```powershell
node governance-console/test/run.mjs          # 预期：59 passed, 0 failed
python scripts/check_links_anchors.py         # 预期：PASS（非归档树 0 失效）；扫 200 份 / 1199 链接 / 归档残留 185
node --import ./scripts/ts-js-resolve.mjs .governance/plugin/verify-governance.ts   # 预期：50 passed / ALL PASSED
node scripts/governance-capability.mjs list    # 预期：两条 Capability 均"可执行"
```

四条都能跑通，才算这一轮交付成立。

`run.mjs` 里的 `F01–F04` 是**无浏览器的前端渲染测试**：把 `public/app.js` 放进 `vm` 上下文（顶部只有函数声明，因此 `renderDetail` 会挂到全局），用最小 DOM 桩调用真实渲染函数。这台机器上 headless Chrome 打不开 `127.0.0.1`，截图不可靠；但那不等于前端不能验。

## 三、交付了什么（按可观察行为列）

| # | 能力 | 怎么自己看 |
|---|---|---|
| 1 | **配置门禁**：落盘前校验拟议状态，15 项检查，阻断项按 POLICY 表执行 | 在控制台改一个非法值 → 抽屉顶部出现"被拦住"，应用按钮禁用；直接打 `/api/apply` 也会被拒 |
| 2 | **门禁零副作用**：被阻断时磁盘一个字节都不变 | 测试 `T22` 用整棵仓库树哈希比对 |
| 3 | **契约从源码推导**：不维护 Capability 名字白名单 | 面板 `CAP_KEY_UNDISPATCHED` / `L3-ORPHAN`；测试 `T13`（新增自定义 Capability 必须 pass） |
| 4 | **批次可还原**：文本备份与目录移动同一基址，路径解析只有一处事实来源 | 应用任意预设 → 「变更批次」显示"可还原" → 还原后 `git status` 干净 |
| 5 | **健康面板**：L1–L5 + 决策记录 + 记录型门禁，每条带 `ruleRef` | `/?view=health`；每条都能点到出处 |
| 6 | **ADR 生命周期**：时效 / 取代 / 复查义务三正交维度 + 派生显示态 | `ADR-004` 判 pass（已被整体取代、无需复查），其余按状态分列 |
| 7 | **记录型门禁**：没有运行记录显示"未运行"，不显示成通过 | 两条：`GATE-LINKS`、`GATE-VERIFY`，各读各的记录 |
| 8 | **手动入口**：让"可手动运行"真的可执行 | `node scripts/governance-capability.mjs rule-appender --experience "…"`（默认干跑） |
| 9 | **TS loader**：让 `.js` 说明符写的 `.ts` 源码能被 Node 直接跑 | 上面 verify-governance 与 rule-appender/test 两条命令 |
| 10 | **检查明细可展开**：后端每条检查带的 `detail`（ADR 四维取值、孤儿目录、静态导入表、重复清单）在前端折叠展示，枚举翻成人话 | `/?view=health` → 任一条目下的「结构化明细（N 项）」；ADR 行显示 `expired（已过期，待复查）` 而不是裸枚举 |
| 11 | **门禁运行历史**：`/api/gatelog` 接进页面，按任务分组显示最近 6 次的时间 / commit / 退出码 / 计数 | `/?view=health` 底部「门禁运行历史」；「运行全部门禁」串行跑两条记录型门禁 |
| 12 | **日志有上限**：`gate-log.jsonl` 越过 400 行压实到最近 200 行（滞回，落在上限内只追加） | 测试 `H19`；面板上明确写"这里不是历史上跑过几次" |

## 四、这一轮修掉的真实缺陷（不是测试造的）

| 缺陷 | 后果 | 证据 |
|---|---|---|
| `snapshot.json` 里放的是 JSON Schema 而不是实例 | SessionStart 注入的 Snapshot 段**静默变空** | 已把 schema 移到 `capabilities/snapshot-writer/`；面板对该状态报 `not_applicable` 且带生成链路证据 |
| `rules/lifecycle.md` 108 行 vs ≤50 行约定 | 入口规则膨胀，每会话都加载 | 拆成 49 行入口 + `docs/developer-guide/staleness-internals.md` |
| `rule-appender`/`staleness-sweeper` 有实现无入口 | 文档按"已生效"写，实际无法执行 | 新增统一手动入口（白名单 + 干跑 + 备份 + 拒写权威区） |
| ADR-007 在两棵树各存一份（仅链接深度不同） | 改一份另一份不跟着变 | 按 git 历史判定原件在 `docs/`，删复制件并记录恢复命令 |
| ADR 计数只扫一个目录 | 「6 份全过期」是错的 | 改扫两棵树；真相是 7 份去重、2 份在时效内 |
| `execFile('cline', …)` 执行 `.ps1` 垫片失败 | 面板假报「cline 不可用」，我据此把 4 份 ADR 判成环境阻塞 | 改为经 pwsh 执行；`cline --version` → 3.0.46 |
| `verify-governance.ts` 的 T4 依赖工作区脏数 | 门禁变成环境的函数：干净时过、脏时挂 | 改为在临时 git 仓库里构造确定 dirty 数，并补上从未测过的**阻断分支** |
| `/api/gatelog` 写完 5 轮，前端引用 **0 行**；`gate-log.jsonl` 无上限 | 运行历史没人看得见；日志每跑一次 +2 行、无界增长，最终没人会打开 | 接上「门禁运行历史」区块；`appendGateLog` 加 400/200 滞回上限，并把"记录条数 ≠ 历史总次数"写进接口与文案 |
| 每条检查的 `detail` 后端算出来了，前端只显示 `observed` 一行字 | ADR 四维取值、孤儿清单、导入表这些**可核对的原始值**被丢掉，只剩我自己写的一句结论 | 新增折叠式「结构化明细」，枚举翻成人话；`F01–F04` 守住列顺序与兜底行为 |
| `check_links_anchors.py` 全盘遍历，把 `.gitignore` 里的草稿目录也算进扫描范围 | 门禁结论变成"工作区里有没有别人放草稿"的函数：另一会话往 `experiments/` 丢 4 份临时译文，门禁从 PASS 变 FAIL(93)，而失效链接全指向沙盒之外 | 只扫**仓库自己的**文档（未跟踪且被忽略的不算，已跟踪的仍照扫）。修完回到 200 份 / 1199 链接 / must_fix 0，与基线逐字一致；`H22` 用"忽略→PASS / 一旦被跟踪→必须 FAIL"两个方向钉住它 |

## 五、ADR 复查的当前结论

| ADR | 状态 |
|---|---|
| ADR-006 | **已复查通过**，期限续至 2026-11-16。依据：`@cline/core@0.0.95` 明写 `beforeModel` 路径 bypass 原生压缩 wrapper |
| ADR-007 | **复查失败已降级**（Verified → Hypothesis），冲突已登记。依据：`registerRule` 接受函数式 content，宿主自带规则也这么用 |
| ADR-001 / 002 / 005 | 仍 blocked（见 `docs/decisions/adr/REVIEW-QUEUE.md`） |

## 六、明确没做的（不要以为已完成）

1. **ADR-007 的结论翻转**：只判到"立论理由失效"，Decision 正文未改（§6「冲突时记录，不裁决」）。翻案需另立 ADR。
2. **版本口径**：`cline --version` 3.0.46 / npm 包 3.0.73 / `@cline/*` 0.0.95，三个数字互不一致，波及 6 个文件 29 处。未定。
3. **`evidence_source_kind` 7/7 缺失**：核对后发现 7 份里只有 2 份能无歧义映射到 §15 的三值枚举。**这是口径决策，不是填空**。
4. **ADR-007 的树归属**（框架级 vs 项目级）：未定。
5. **hook 链路是否真的跑通**：`plugin-loaded.marker` 与 `traces.jsonl` 仍是 100 天前。`GATE-VERIFY` 只证明插件逻辑对，**不证明 Cline 真的触发**。
6. **15 份孤儿文档**（其中 9 份在 `docs/decisions/investigation/`）：未处理。

## 七、一条边界

这套东西证明的是：**配置变更可审计、可还原、落盘前有门禁；健康状态可逐条追溯到规则出处。**

它**不**证明「治理框架提升了 agent 成功率」——那需要单独的对照实验。把这两件事混成一件，是这类项目最常见的过度声明。
