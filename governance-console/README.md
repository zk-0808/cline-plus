# governance-console

框架的本地控制台：把 `.governance/` 里的开关、参数、层装配和一键安装收在一个页面上。

```
node governance-console/server.mjs
```

启动后终端会打印带 token 的地址，用那个地址打开（token 是必须的，见「安全边界」）。

```
governance-console/
├── server.mjs            零依赖 HTTP 服务：token/Origin 防护、静态服务、路由
├── lib/governance.mjs    状态采集 + 变更计划（行级 diff）+ 应用 / 批次 / 还原
├── lib/runner.mjs        白名单脚本执行（4 个任务，客户端不能传命令）
└── public/               index.html · app.js · style.css · favicon.svg
```

---

## 它控制什么（全部是既有权威文件，不新增配置）

| 页面区块 | 写入目标 | 权威定义 |
|---|---|---|
| Hook 启停（5 个） | `.governance/hooks/config.json` → 各 hook 的 `enabled` | `delivery-framework-design.md §四` 加载顺序 |
| Capability 启停 + 参数 | 同一份 `config.json` → `capabilities.*.enabled` / `args` | 同上 · `§三` 各目录契约 |
| 宪法可调参数（8 项） | `.governance/core/constitution.md` 底部「项目可调参数」表 | 宪法自身声明：*其他项目接入时改此处即可，不动判定动作* |
| 装配预设（5 个） | 移动目录到 `runtime/console-disabled/` + 关闭对应 hook | `delivery-framework-design.md §五` 删除矩阵 |
| 一键安装 | 执行 `scripts/sync-governance-plugin.ps1` 等 | 脚本本身 |

**控制台不持有任何状态。** 每个开关背后都是你随时可以用编辑器手改的文件；这里只是加了一层带 diff 预览与安全备份的操作面。

---

## 三条与仓库治理纪律一致的设计约束

**1. 先出计划，再落盘。**
点任何开关都不会立刻改文件——先生成一份计划，抽屉里给出**行级 diff**、副作用提示与可选还原批次，确认后才写。

**2. 「删除矩阵」实现为可逆的停用。**
`§五` 原文是「删什么」，但不可逆的删除不该由一次误点触发。所以预设的实际动作是**把目录移进 `runtime/console-disabled/<batch>/`**，并在 `runtime/console-batches/<batch>.json` 留清单；「变更批次 → 还原」把它整体移回去。停用区与备份区是同一个机制。

**3. 计划带乐观并发控制。**
计划里记录每个被改文件的 `before` 哈希。应用时若磁盘内容已变（你手改了、或另一个终端改了），计划**作废并要求重新生成**，绝不静默覆盖。

---

## 安全边界（这个工具能改文件、能跑脚本，所以必须写清）

- **只绑 `127.0.0.1`**，不监听外网
- **所有 API 需要 token**：启动时随机生成，注入页面；不带 token 的请求一律 401
- **跨站防护**：校验 `Origin` 与 `Sec-Fetch-Site`，挡住其它网页对你本机服务的调用（DNS rebinding / CSRF）
- **静态文件白名单**：只服务 4 个文件名，无目录穿越
- **脚本执行只认白名单**：`lib/runner.mjs` 里 4 个任务，客户端只能传 `taskId`，不能传命令；`--no-exec` 可整体关闭
- **破坏性任务二次确认**：重置安装会删掉本地插件副本再重建，前端强制 `confirm`

---

## 参数

```
--port <n>     监听端口（默认 7717）
--repo <path>  仓库根（默认当前目录，须含 .governance/）
--no-exec      禁用脚本执行；配置编辑与状态查看仍可用
--help
```

---

## 已知局限

- **它是把现有契约做成界面，不是新的权威源。** 页面上的中文说明与阈值理由若与 `dev-rules.md` / `constitution.md` 冲突，以文件为准。
- **不校验 Cline 端实际行为。** 它读 `.governance/runtime/plugin-loaded.marker` 判断 SessionStart 是否跑过，但 marker 陈旧只说明"没刷新"，不定位原因；真正定位要按 `plugin-dev-sop.md §2` 读源码。
- **单用户本地工具**，没有多会话隔离与权限模型。多人共用一台机器时不要开。
- **装配预设只处理 `§五` 列出的 5 种组合**，更细的裁剪请直接删目录——那时 Git 就是你的还原机制。
