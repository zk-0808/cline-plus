# Handoff — P5 Plugin Capability Spike 执行完毕：No-Go，ADR-003 落地

## 本会话决策

| 决策 | 状态 |
|------|------|
| P5 Capability Spike 实跑（CLI 方式，#5 + #6） | ✅ 执行完毕 |
| Spike Go/No-Go 判定 | ✅ **No-Go**（工程性退出，外部 CLI 运行时能力缺失） |
| 落地 ADR-003（Plugin Spike 退出决策） | ✅ 完成 |
| mechanism-candidates #1–#6/#14 暂缓标记 | ✅ 完成（触发条件=Cline Runtime 开放 plugin 装载入口） |
| 校正"CLI 落后需升级"事实误判 | ✅ 完成（CLI 3.0.30 即最新版，与 VS Code 扩展独立版本号） |
| 更新 handoff | ✅ project-rules.md 4.b（ADR-003 落地为终态决策）+ 4.a（用户结束语境） |

---

## 本会话净变化

### 1. P5 Capability Spike 实跑结论：No-Go

实跑记录见 [experiments/p5-spike/run-p5-capability-spike.md §5](../experiments/p5-spike/run-p5-capability-spike.md)。四重独立验证全部失败：

| # | 验证项 | 结果 |
|---|--------|------|
| 1 | 我方 p5-spike-plugin.ts 写法符合官方模板（含 export default） | ✅ 正确，排除文件问题 |
| 2 | cline plugin install 我方插件 + config plugins | ❌ No plugins found（产物物理存在但不被识别） |
| 3 | 手动放到官方发现根路径 .cline/plugins/ | ❌ No plugins found |
| 4 | **官方样例 weather-metrics.ts** install + config plugins | ❌ **No plugins found（决定性：排除我方实现缺陷）** |
| 5 | cline -c 实跑 verbose 日志 | ❌ 仅内置 [hook:agent_start/end]，无 plugin 加载、beforeRun 未触发、session-start.log 未生成 |

**根因**：CLI 3.0.30 只实现 plugin install/uninstall 文件管理，运行时发现/装载链路尚未落地。与 docs.cline.bot "plugins not applicable on VSCode" 一致。

### 2. 关键事实校正："更新后还是 3.0.30" 是正常的

- 直接查 registry.npmjs.org/cline/latest：`cline`（CLI）包最新版即 **3.0.30**（依赖 @cline/sdk@0.0.52）。
- `cline`（CLI）与 `saoudrizwan.claude-dev`（VS Code 扩展 v3.89.2）是**两套独立版本号**。
- 上一会话推断"CLI 落后 89 版需升级"是错的——3.0.30 无需也无法升级。

### 3. Plugin 路线现状（回答最初战略问题）

registerMessageBuilder 是 Plugin 独占能力（结论不变），但**目前无任何可交付载体能运行它**：
- VS Code 扩展：无 plugin 装载入口（ADR-002 确认的"必须载体"）；
- CLI 3.0.30（最新版）：有 install 命令但运行时装不起来，连官方样例亦然。

退出性质为**工程性退出（外部能力缺失），非永久否决**。Plugin 作为"未来迁移线"定位保留。

### 4. 网络核查

cline 官方 GitHub issues "plugin + No plugins found" 0 条，通用搜索无命中——非孤立 bug，是当前分发版能力未落地的自然结果。

---

## 本会话修改文件

| 文件 | 改动 |
|------|------|
| `docs/decisions/ADR-003-plugin-spike-exit.md` | **新建**——P5 Spike 退出决策（No-Go，工程性退出，完整证据链 + 恢复条件） |
| `experiments/p5-spike/run-p5-capability-spike.md` | §5 填入实跑记录、环境事实、四重验证表、No-Go 判定；状态置 concluded — No-Go |
| `docs/mechanism-candidates.md` | #1–#6、#14 状态改为"候选（暂缓）— 触发条件：Cline Runtime 开放 plugin 装载入口（ADR-003）" |
| `docs/decisions/README.md` | 索引表新增 ADR-003 行 |
| `docs/handoff.md` | 覆盖为本交接 |

---

## 当前路线图

权威源：
- [survey.md §9.3 最终路线状态](search-orchestrator/survey.md)
- [mechanism-candidates.md](mechanism-candidates.md)

本会话无 search-orchestrator P 级路线状态变化。ADR-003 为全局 Plugin 决策，已登记 decisions/README.md，按"三份文档各管一摊"不进 survey.md §9.1（与 ADR-002 Update 1 同样判定）。

P 级机制 active 清单（6 条，不变）：P1 / P1.5 / P3 / P4 / P5 Gap Ledger / P6。
Infra 机制 active（1 条）：#24 wrapper。

---

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| 决策文档事实审核 7 项修订 | 见更早 handoff 修订表（capability-probe session_id 过时 / arXiv 年份笔误 / 5倍声明无源 / Exa 否定召回自相矛盾 / Exa highlights 描述过时 / mechanism-candidates #24 token-bucket 错误 / 永久 Tier C 措辞张力） | 中 |
| **Plugin 路线恢复监测** | ADR-003 恢复条件任一满足时重启 P5 Spike（复用 experiments/p5-spike/ 现有产物）：① VS Code 扩展集成 plugin 装载入口；② CLI 后续版本 config plugins 能识别已安装插件；③ 用户主工作流迁移到 CLI/Kanban。以触发条件控制，不定期巡检 | 低（条件性） |
| CSDN 博客发布 | 博客已写好（`docs/blog/csdn-search-orchestrator.md`），待用户手动复制到 CSDN 编辑器发布 | 中 |
| 消融实验（Ablation） | GPT 终评建议。按计划推进，不作为主任务 | 中 |
| SKILL 平台化拆分 | 触发条件：SKILL > 1200 行 或 单 Phase > 300 行。当前 ~800 行，未达触发线 | 低 |
| Goggle 域名表数据化 | 触发条件：Goggle >10 或单表 >20 行。当前 5 个，未达触发线 | 低 |
| #22 Browser Fetch 启动评估 | 候选（暂缓）。仅当 Tier C snippet-only 被证明严重影响答案质量才启动 | 低 |
| #24 V2 backend 切换 | 暂缓。DDG 持续不可用时启动 | 低 |

---

## Handoff（下次会话第一句话建议）

首句话提示词：

```text
先读 docs/project-rules.md 一次，遵守里面的三份文档职责划分与五条防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话执行了 P5 Capability Spike（CLI 方式），结论 **No-Go**。四重独立验证（我方文件写法 / 我方 install / 手动发现路径 / **官方样例 weather-metrics.ts**）全部 "No plugins found"，证明 CLI 3.0.30（npm `cline` 包最新版）运行时无法装载 plugin，非我方实现缺陷。结合 VS Code 扩展无 plugin 装载入口，registerMessageBuilder 当前**无任何可交付载体**——这是 ADR-002"VS Code 必须载体"约束下的硬阻断。已落地 ADR-003（工程性退出，非永久否决，Plugin 保留为未来迁移线），mechanism-candidates #1–#6/#14 暂缓（恢复条件=Cline Runtime 开放装载入口）。另校正了"CLI 落后需升级"误判：`cline` CLI 与 VS Code 扩展是独立版本号，3.0.30 即最新。下次会话 Plugin 方向无主动动作，按恢复条件被动监测即可；可推进决策文档 7 项事实修订或消融实验。
