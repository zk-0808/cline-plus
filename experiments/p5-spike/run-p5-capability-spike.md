# Run #P5-Spike: Cline Plugin Capability Spike

**日期**：2026-06-26
**designated_executor**：TRAE agent（代码编写 + 框架文档）→ 用户手动（CLI 安装 + 实跑验证）
**时间窗口**：0.5–1 天工程量上限
**状态**：deferred（2026-06-27，实验环境前提动摇）— #6 session_start hook 已实证触发（结论保留）；#5 compact 双产物实证因 CLI 载体不稳定 + 实验环境与生产环境错位暂停。详见 [ADR-004](../../docs/decisions/ADR-004-p5-spike-pause.md)

---

## 1. 实验目的（经第三轮外部评审确认）

验证 Cline Plugin 独占的 `registerMessageBuilder` 能力是否足以支撑 compact → handoff → index 自动化闭环，且维护成本合理。

**实验定位**：Capability Spike（能力验证），非产品实验。只回答一个问题：
> Plugin 独占的 `registerMessageBuilder` 能力，是否足以支撑 compact → handoff → index 的自动化闭环，并且其维护成本是否合理？

**期权价值**（GPT 评审补充）：本次 Spike 是"购买未来选择权的小额投入"——验证成功获得唯一能力第一手知识 + 未来迁移低成本入口；验证失败则 ADR 可依据技术事实退出。不违反 ADR"实验结束必须形成明确结论、避免无限观望"约束。

---

## 2. 验证范围

| 项 | 包含 | 说明 |
|----|------|------|
| #5 compact + handoff 双产物 | ✅ | registerMessageBuilder 触发 compact 时同步写出 handoff.md + 追加 index.jsonl |
| #6 session_start hook | ✅ | 用户选择包含。GLM 评审建议不含（依赖未探测能力），若跑不通则降级为只验证 #5 |

**不包含**（两份评审一致建议删除）：
- 体验对比
- resume 自动化
- 边界讨论
- #1–#4（维持"等待 Runtime 能力"暂缓标记）

---

## 3. Go / No-Go 标准

### Go 标准（全部满足）

1. `registerMessageBuilder` 能稳定介入 model call 前的消息重写
2. compact 触发时自动生成 handoff.md
3. index.jsonl 自动追加（compact 事件记录）
4. （#6）session_start hook 能在 session 启动时触发（若跑不通则降级，不影响 #5 Go 判定）

### No-Go 标准（满足任一）

- API 无法稳定实现（registerMessageBuilder 不工作）
- SDK 修改量明显超过 ADR 原设想（需大量侵入修改）
- 无法形成稳定闭环（compact → handoff → index 链路断裂）
- Plugin 引入后维护复杂度明显高于自动化收益

**禁止**：不加入"感觉没有价值"等主观指标。价值判断发生在技术验证之后。

---

## 4. 执行步骤

### Phase 1: 代码准备（TRAE agent）

1. ✅ fork custom-compaction.ts 母本（来源：[cline/cline/sdk/examples/plugins/custom-compaction.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts)）
2. ✅ 改造为 p5-spike-plugin.ts：
   - registerMessageBuilder 触发 compact 时，同步写出 handoff.md
   - 追加 index.jsonl（compact 事件记录）
   - 添加 session_start hook（#6，尝试 beforeRun 或 onEvent）
3. ✅ 写 CLI 安装与实跑说明（README.md）

### Phase 2: CLI 实跑验证（用户手动）

1. `npm i -g cline`（全局安装 Cline CLI）
2. `cline plugin install ./p5-spike-plugin.ts --cwd experiments/p5-spike`
3. `cd experiments/p5-spike && cline -i "测试 prompt（足够长以触发 compact）"`
4. 检查 handoff/handoff.md 是否生成
5. 检查 handoff/index.jsonl 是否追加
6. 记录 Go/No-Go 结论

### Phase 3: 结论落地（TRAE agent）

1. 记录 Spike 结果到本文件 §5
2. Go → 写 ADR-003（Plugin 定位为 Runtime 自动化能力层）+ 同步 mechanism-candidates #5/#6 + survey.md §9.1
3. No-Go → 写 ADR-003（退出，工程性退出理由）+ 同步 mechanism-candidates #1-#6/#14（"等待 Runtime 能力"）+ survey.md §9.1

---

## 5. Spike 结果

**结论：partial Go（2026-06-26）。插件被发现、加载、`beforeRun` hook 实证触发，运行时执行成功。先前 No-Go 判定因验证方法假阴性已撤销。**

### ⚠️ 撤销记录：先前 No-Go 系误判

2026-06-26 首次判定 No-Go，依据"`config plugins` 报 No plugins found，连官方样例也加载不了"。**该结论错误**，根因是验证方法缺陷：

- 错误命令：`cline -c <p5-spike> config plugins`——误以为 `-c` 能给 `config plugins` 指定发现根目录；
- 实际行为：`config plugins` **只扫描真实当前工作目录（cwd）的 `.cline/plugins`，不理会 `-c` 参数**；
- 当时真实 cwd 是 `E:\cline++`（未安装插件）→ 必然 No plugins found → **假阴性**。

用户用正确方式（先 `cd` 进目录再 `cline config plugins`）复测后，插件被正常发现，证伪了 No-Go 的全部核心证据。

### 环境事实

| 项 | 值 | 来源 |
|----|----|------|
| Cline CLI 版本 | 3.0.30（npm `cline` 包 `latest`，已是最新版） | registry.npmjs.org/cline/latest |
| CLI 依赖 SDK | @cline/sdk@0.0.52 / @cline/core@0.0.52 | 同上 |
| VS Code 扩展版本 | 3.89.2（独立版本号体系，与 CLI 无关） | VS Code Marketplace |
| 模型 | deepseek-v4-flash（用户本地 cline 配置） | 实跑日志 |

> 修正记录：前期曾误判"CLI 落后 89 版需升级"。实际 `cline`（CLI）与 `saoudrizwan.claude-dev`（VS Code 扩展）是两套独立版本号，3.0.30 即 CLI 最新版，无需也无法升级。

### 实跑记录（修正后）

| 步骤 | 结果 | 备注 |
|------|------|------|
| cline plugin install p5-spike-plugin.ts | ✅ 安装成功 | 工作区与全局两处均成功 |
| **config plugins（正确 cwd）** | ✅ **Discovered plugins: p5-spike-plugin** | 全局目录下正常发现，证明发现机制工作、文件写法正确 |
| 官方样例 weather-metrics.ts install + config plugins | ✅ Discovered plugins: weather-metrics | 之前的"加载不了"系假阴性 |
| cline -v 实跑（插件已装载） | ✅ 正常完成会话 | deepseek-v4-flash，1 iteration |
| **#6 session_start hook（session-start.log）** | ✅ **已生成并写入** | `[2026-06-26T12:24:03.338Z] session_start hook fired (beforeRun)` — **beforeRun hook 实证触发** |
| #5 handoff.md 生成 | ⏳ 待实证 | 需长任务触发 compact（token > 90000）才会调用 registerMessageBuilder |
| #5 index.jsonl 追加 | ⏳ 待实证 | 同上 |

### Go/No-Go 判定（修正后）

**partial Go**：

- ✅ **#6 已确认 Go**：`beforeRun`（session_start 类）hook 在 session 启动时**实证触发**并成功写出副作用文件。这直接命中 Go 标准第 4 条。
- ✅ **插件运行时装载链路成立**：发现 → 加载 → hook 执行全链路打通，证伪了 No-Go 标准"API 无法稳定实现"。
- ⏳ **#5 待实证**：`registerMessageBuilder` 的注册路径与 `beforeRun` 在同一 `setup`/插件对象中，hook 既已运行，messageBuilder 被装载的概率很高；但 compact 双产物（handoff.md + index.jsonl）尚未实跑触发（需构造 token > 90000 的长任务）。在补完该实证前不下最终 Go。

**关键修正结论**：Plugin 独占能力在 **CLI 3.0.30 上运行时可用**（与之前误判相反）。ADR-002"VS Code 必须载体"约束仍是另一独立事实（VS Code 扩展无装载入口），但 CLI 路径已被证明可跑通——这恢复了 Plugin 作为运行时自动化层的技术可行性。

### 2026-06-27 事件：#5 实证暂停（实验环境前提动摇）

执行 #5 实证准备时发现 ADR-002 Validation Plan 选择 CLI 作为实验环境的前提被动摇。详见 [ADR-004](../../docs/decisions/ADR-004-p5-spike-pause.md)。

| 事实 | 证据 |
|------|------|
| CLI 与 VS Code 扩展是两套独立版本号体系 | CLI 3.0.30→3.0.31 vs VS Code 扩展 3.89.2（`globalState.json` `clineVersion`）|
| CLI 后台自动升级中断，bin shim 损坏 | `E:\node-global` 仅存临时残留（`.cline-*`），`cline` 命令不可用；`npm install -g cline@3.0.30` 修复后再次自动升至 3.0.31；`cline update` 无 disable 选项 |
| CLI 3.0.31 run_commands 工具调用崩溃 | session `1782529691185_843jq`：deepseek-v4-flash 输出对象格式 `{command, args}`，cline core 期望字符串调 `.trimStart()` → TypeError，turn 1 即崩（`cline.log` 03:08:17）|
| 实验环境(CLI)与生产环境(VS Code)错位 | VS Code 扩展不支持 plugin（ADR-002 Update 1），CLI 验证结论无法迁移 |

**关键判断**：#5 未跑通不是机制失败——plugin 已加载（`session-start.log` 03:08:14 写入），`registerMessageBuilder` 注册路径与已实证的 `beforeRun` 在同一 plugin 对象，compact 未触发是载体崩溃（turn 1 即崩）阻断 token 累积。是实验环境前提动摇，不是 Plugin 机制证伪。

**处置**：#5 实证暂停，P5 Spike 状态 deferred。#6 已实证结论保留。恢复条件见 ADR-004 §恢复条件。插件临时降阈值改动已回滚（`MAX_INPUT_TOKENS` 恢复 120_000）。

---

## 6. 评审依据

本 Spike 框架基于第三轮外部评审（GPT + GLM-5.2）共识：
- GPT：C-lite → B，0.5-1 天，仅 #5，期权价值分析
- GLM-5.2：C → B，2-3 天，仅 #5（建议不含 #6），触发条件清单

用户选择：#5 + #6，0.5-1 天，CLI 全局安装，cline++/experiments/p5-spike/

详见 [ADR-002-p5-experiment-exit-review.md](../../docs/decisions/ADR-002-p5-experiment-exit-review.md) 第三轮评审记录。

---

## 7. 教训记录

### 教训 1（重大失误）：用错误的验证方法得出结论，导致 No-Go 误判

**经过**：判定 P5 Spike No-Go 的核心证据是 `config plugins` 报 "No plugins found"。该证据是用 `cline -c <dir> config plugins` 取得的，我（执行者）**想当然地以为 `-c` 会作为 `config plugins` 的发现根目录**，但实际上 `config plugins` 只扫描真实 cwd，`-c` 对它无效。当时真实 cwd 不含插件，于是必然 No plugins found——一个纯粹由验证方法缺陷制造的**假阴性**。基于此还进一步用"官方样例也加载不了"来"交叉验证"，但那次测试同样在错误 cwd 下进行，于是假阴性被错误地当成了"决定性证据"。

**后果**：写出了一份事实错误的 ADR-003（No-Go 退出），并据此暂缓了 mechanism-candidates #1–#6/#14。直到用户用正确方式（`cd` 进目录再查）复测，才暴露真相。

**根因**：
1. **未验证工具参数的真实语义**就用它取证据（假设 `-c` 影响 `config`，未读 help 确认）；
2. **多重"独立验证"实为同一缺陷的重复**——四条证据全部依赖同一个错误前提（错误 cwd），不构成真正的独立交叉验证；
3. **阴性结果未做对抗性自检**——得到 No plugins found 时，没有先问"会不会是我查的方式错了"，而是直接采信。

**纠正纪律**：
- 取关键证据（尤其用于下退出/否决结论）前，必须先用一个**已知应成功的对照**确认验证方法本身有效（本例：先确认官方样例在**正确方式**下能被发现，再去测我方插件）；
- 阴性结论必须排除"测量工具/方法错误"后才能采信；
- "多条证据"若共享同一前提，不算独立验证。

### 教训 2：Agent 非交互终端无法运行 cline 交互式会话（EBADF）

**现象**：在 Agent 的非交互终端执行 `cline -v "..."` 报 `error: EBADF: bad file descriptor, write`，命令挂起无响应。

**原因**：cline 交互式会话需要真实终端（TTY）。Agent 的后台/非交互终端没有有效的 TTY 文件描述符，cline 向其写入时即 EBADF。

**纪律**：凡需实际发起 cline 会话的命令（`cline -i` / `cline -v "..."` / 任何进入 agent loop 的调用），**必须交由用户在真实终端执行**，Agent 不代跑。Agent 只负责：安装/配置类非交互命令、目录与文件检查、结果判读。此条与 project-rules.md §约束 5（执行主体边界）同构——不在错误的执行环境做错误的事。

> 备注：本项目（原 cline 增强项目）此前已花费相当篇幅约束此类"运行时/执行环境"问题，本教训应回流到相应规则层（见 handoff 后续动作）。
