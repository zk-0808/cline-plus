# Run 13 — Run B Output (P5 v2: Evidence Map → Claim Graph)

> **问题**: Kubernetes Gateway API 是否值得从 Ingress 迁移：成熟度、控制器兼容性、迁移风险与适用场景
> **日期**: 2026-06-25
> **方法**: P5 v2 — Evidence Nodes → Relation Edges → Conflict/Gap Ledger → Final Answer
> **Evidence Pool**: E1–E16 (Phase 3 of run-13-phase0-evidence.md)

---

## Step 1 — Evidence Nodes

### N1 — Gateway API v1.4.0 GA
- **Assertion**: Gateway API 核心 API 已于 v1.4.0 达到 GA（2025-10-06）；BackendTLSPolicy、supportedFeatures、Named rules 三个功能进入 Standard channel。
- **Evidence**: [E1 / F1] — *"The Kubernetes SIG Network community presented the General Availability (GA) release of Gateway API (v1.4.0)!"*
- **Source**: https://kubernetes.io/blog/2025/11/06/gateway-api-v1-4/ [T1]
- **Scope**: v1.4.0, 2025-10-06
- **Certainty**: High

### N2 — Gateway API v1.5: 六项 feature 升级到 Standard
- **Assertion**: v1.5（2026-02-27）将 ListenerSet、TLSRoute、HTTPRoute CORS Filter、Client Certificate Validation、Certificate Selection、ReferenceGrant 共六项 Experimental features 升级为 Standard，是迄今为止最大版本。
- **Evidence**: [E2 / F2] — *"Gateway API v1.5 brings six widely-requested feature promotions to the Standard channel"*
- **Source**: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/ [T1]
- **Scope**: v1.5.0, 2026-02-27
- **Certainty**: High

### N3 — 主流控制器通过 Conformance 认证
- **Assertion**: Cilium、GKE、HAProxy Ingress、Istio、kgateway、NGINX Gateway Fabric、Traefik Proxy 等 13 个实现已 formal conformant。
- **Evidence**: [E3 / F3] — *"Conformant implementations: ... Cilium, GKE, HAProxy Ingress, Istio, kgateway, NGINX Gateway Fabric, ... Traefik Proxy"*
- **Source**: https://gateway-api.sigs.k8s.io/docs/implementations/list/ [T1]
- **Scope**: 截至 v1.5（2026-02）
- **Certainty**: High

### N4 — 部分控制器仅为 Partially Conformant
- **Assertion**: Contour、Envoy Gateway、Kong 等为 Partially Conformant，未通过全部标准测试。
- **Evidence**: [E3 / F3] — 官方列表将 Contour、Envoy Gateway、Kong 列在 Partially Conformant 分区。
- **Source**: https://gateway-api.sigs.k8s.io/docs/implementations/list/ [T1]
- **Scope**: 截至 v1.5（2026-02）
- **Certainty**: High

### N5 — Ingress2Gateway v1.0 支持 30+ 注解自动转换
- **Assertion**: Ingress2Gateway 1.0 自动转换 30+ Ingress-NGINX annotations（CORS、backend TLS、regex matching、path rewrite），含集成测试验证行为等价性。
- **Evidence**: [E4 / F6] — *"Ingress2Gateway supports over 30 common annotations ... backed by controller-level integration tests that verify the behavioral equivalence."*
- **Source**: https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/ [T1]
- **Scope**: Ingress2Gateway v1.0, 2026-03
- **Certainty**: High

### N6 — 部分重要注解无法自动转换
- **Assertion**: `configuration-snippet`、`proxy-body-size` 等 production 常用注解无法被 Ingress2Gateway 自动转换，工具输出 WARN 提示。
- **Evidence**: [E5 / F6] — *"Unsupported annotation nginx.ingress.kubernetes.io/configuration-snippet"* 和 *"Failed to apply ... Most Gateway API implementations have reasonable body size and buffering defaults"*
- **Source**: https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/ [T1]
- **Scope**: Ingress2Gateway v1.0
- **Certainty**: High

### N7 — Gateway API 让简单的事情变难（社区反证）
- **Assertion**: Gateway API 让困难的事情变得可能，但让简单的事情变难。Ingress-NGINX 是 "a dead simple solution that just works"。
- **Evidence**: [E6 / F4] — *"Gateway API makes hard things possible - but easy things hard."*
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [T3]
- **Scope**: 2026-01-31, 个人迁移经验
- **Certainty**: Medium — 单一 T3 来源，缺乏交叉验证

### N8 — TLS + ExternalDNS 循环依赖死锁
- **Assertion**: Gateway API 模式下 TLS 证书、DNS 与 HTTPRoute 之间存在循环依赖：listener 无证书不健康 → HTTPRoute 不可引用 → ExternalDNS 不可用 → http-01 challenge 死锁；仅 dns-01 可绕过。
- **Evidence**: [E7 / F4] — *"Without a valid DNS record, you can't complete a http-01 challenge. It's a deadlock."*
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [T3]
- **Scope**: c ert-manager + http-01 场景
- **Certainty**: Medium — 一条逻辑自洽的工程分析，但仅 T3 来源

### N9 — Envoy Gateway 路由更新导致临时流量中断
- **Assertion**: Envoy Gateway 在路由配置更新期间出现临时流量中断。
- **Evidence**: [E8 / F8] — *"Envoy Gateway: During route updates, there is a temporary downtime for traffic."*
- **Source**: https://github.com/howardjohn/gateway-api-bench [T2]
- **Scope**: 基准测试 v2, 2026 初
- **Certainty**: Medium-High — Istio 维护者的公开可复现基准测试

### N10 — NGINX Gateway Fabric 吞吐量为中位值的 1/20
- **Assertion**: NGINX Gateway Fabric 在基准测试中吞吐量仅为中位实现值的 1/20，且在解析有效 HTTPRoutes 时可能崩溃。
- **Evidence**: [E8 / F8] — *"Nginx throughput is 20x worse than the median implementation."* 和 *"Nginx may crash while processing valid HTTPRoutes."*
- **Source**: https://github.com/howardjohn/gateway-api-bench [T2]
- **Scope**: 基准测试 v2, 2026 初
- **Certainty**: Medium-High

### N11 — Traefik 合并所有 Gateway 到单一组件违反 namespace 隔离
- **Assertion**: Traefik 将所有 namespace 的 Gateway 合并到单一共享组件，违背了 Gateway API 的 namespace 安全假设。
- **Evidence**: [E8 / F8] — *"Traefik consolidates all Gateways, even in different namespaces, onto a single shared component."*
- **Source**: https://github.com/howardjohn/gateway-api-bench [T2]
- **Scope**: 基准测试 v2, 2026 初
- **Certainty**: Medium-High

### N12 — Cilium Envoy 配置 >1.5MB 后无法更新
- **Assertion**: Cilium 在生成的 Envoy 配置超过 1.5MB（etcd limit）后，代理配置不可再更新。
- **Evidence**: [E8 / F8] — *"After the generated Envoy configuration reaches 1.5mb (etcd limits), the proxy configuration is unable to be updated."*
- **Source**: https://github.com/howardjohn/gateway-api-bench [T2]
- **Scope**: 基准测试 v2, 2026 初
- **Certainty**: Medium-High

### N13 — Gateway API 不随 Kubernetes 发行，需额外安装 CRDs
- **Assertion**: Gateway API 不是 Kubernetes 核心组件，需独立安装 CRDs，且依赖 server-side apply。
- **Evidence**: [E9 / F4] — *"Ingress is a core component of Kubernetes, the Gateway-API is not shipped with Kubernetes and needs to be installed separately via CRDs."*
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [T3]
- **Scope**: 通用运维开销
- **Certainty**: High — 该事实是公开文档可以验证的，不依赖 T3 来源的权威性

### N14 — 控制器选择是"最困难的部分之一"
- **Assertion**: 社区反馈指出选择哪个 Gateway 控制器本身就是采用 Gateway API 最困难的环节之一。
- **Evidence**: [E9 / F4] — *"Right now, the selecting a Gateway is actually the hardest part."*
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [T3]
- **Scope**: DevOps / 平台团队视角
- **Certainty**: Medium

### N15 — 各实现引入自有 CRDs，造成潜在的 vendor lock-in
- **Assertion**: NGINX Gateway Fabric 引入 10+ 自有 CRDs，Kong 和 Envoy Gateway 也有类似做法。核心 API 未覆盖 auth/mTLS，实现用扩展填补空白，造成 vendor lock-in。
- **Evidence**: [E10 / F4] — *"the nginx-gateway-fabric for example already brings their own set of 10 CRDs ... Gateway API, by design, is extendable and vendors are using this extendibility to overcome the shortcomings of the core API."*
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [T3]
- **Scope**: 所有 Gateway API 实现（程度因实现而异）
- **Certainty**: Medium — 可验证 NGINX Gateway Fabric 确实有 10+ CRDs，但"lock-in"的严重性评估有主观成分

### N16 — Ingress API 三大官方限制
- **Assertion**: Kubernetes SIG Network 官方确认 Ingress API 三限：功能仅限于 HTTP/HTTPS + TLS termination；依赖 annotations（不可移植）；权限模型不足（不适合多团队）。
- **Evidence**: [E11 / F5] — *"Limited features ... Reliance on annotations for extensibility ... Insufficient permission model."*
- **Source**: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/ [T1]
- **Scope**: Ingress API 全局
- **Certainty**: High

### N17 — Gateway API 解决了 Ingress 的权限模型问题
- **Assertion**: Gateway API 通过四个显式角色（app developer、app admin、cluster operator、infrastructure provider）实现角色分离，解决多团队集群的权限管理问题。
- **Evidence**: [E11 / F5] — *"Gateway API includes four explicit personas: the application developer, the application admin, the cluster operator, and the infrastructure providers."*
- **Source**: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/ [T1]
- **Scope**: Gateway API 全局
- **Certainty**: High

### N18 — Ingress-NGINX 已 EOL（2026 年 3 月），安全补丁停止
- **Assertion**: Ingress-NGINX 于 2026 年 3 月 archive/EOL。IngressNightmare（CVSS 9.8）暴露了 ingress 漏洞可产生集群级影响。
- **Evidence**: [E12 / F7+交叉验证] — *"ingress-nginx was archived on March 24, 2026"* 和 *"Ingress NGINX reached end-of-life (EOL)"*
- **Source**: https://www.datadoghq.com/blog/migrate-to-gateway-api/ [T2] + dev.to [T3] 交叉验证
- **Scope**: Ingress-NGINX 项目全局
- **Certainty**: High — 多方来源确认

### N19 — Helm chart 生态对 HTTPRoutes 支持不成熟
- **Assertion**: 多数 Helm charts 仍未原生支持 HTTPRoutes。创建通用 HTTPRoute Helm 模板"quite hard"。
- **Evidence**: [E13 / F4] — *"New technologies need time for adoption, it is totally normal that most helm charts do not yet ship with HTTPRoutes alongside Ingress."* 和 *"Creating a good general helm template for HTTPRoutes is quite hard."*
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [T3]
- **Scope**: 2026 年初 Helm 生态
- **Certainty**: Medium — 单一 T3 来源，但可部分验证

### N20 — Gateway API 三层 Conformance 模型允许实现差异
- **Assertion**: Gateway API 定义 Core（所有实现必须支持）、Extended（可选）、Implementation-specific 三层。官方明确反对在 Gateway API 资源上用 annotations 做扩展。
- **Evidence**: [E14 / F5] — *"Extension points do not include annotations on Gateway API resources. This approach is strongly discouraged for implementations."*
- **Source**: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/ [T1]
- **Scope**: Gateway API 全局
- **Certainty**: High

### N21 — 迁移推荐策略：逐步迁移、side-by-side 运行
- **Assertion**: Datadog 和 GKE 官方指南推荐逐步迁移：先共存捕获基线，渐进转换流量，最后切换。Ingress API 可与 Gateway API 并行运行。
- **Evidence**: [E15 / F7+F5] — *"The Ingress API and NGINX controller can coexist with your Gateway API implementation throughout the migration."* 和 *"the most effective approach ... is to run both your existing Ingress API and the new Gateway API configuration in parallel."*
- **Source**: datadoghq.com [T2] + cloud.google.com [T1]
- **Scope**: 迁移策略通用
- **Certainty**: High

### N22 — 已知 annotations 总量（119+）远超自动迁移覆盖（30）
- **Assertion**: ing-switch 项目映射了 119+ Ingress-NGINX annotations 并给出 impact ratings。Ingress2Gateway 仅覆盖约 30 个，覆盖率 ≈25%。
- **Evidence**: [E16 / F6+T3] — *"ing-switch maps 119 annotations with impact ratings"* 和 *"Ingress2Gateway supports over 30 common annotations"*
- **Source**: blog.kubesimplify.com [T3] + kubernetes.io [T1]
- **Scope**: 2026 年 annotation 生态
- **Certainty**: High — T1+T3 交叉验证

### N23 — Typical production Ingress 含 10–15 个 annotations
- **Assertion**: 生产环境典型 Ingress 资源包含 10-15 个 NGINX annotations（SSL、auth、rate limiting、CORS、session affinity 等）。
- **Evidence**: [Q5 Highlights / E16 交叉] — *"A typical production Ingress has 10-15 NGINX annotations for SSL, auth, rate limiting, CORS, session affinity, and more."*
- **Source**: blog.kubesimplify.com [T3]
- **Scope**: 通用生产环境
- **Certainty**: Medium — 单 T3 来源，但符合工程经验

### N24 — Istio 和 kgateway 在基准测试中无问题
- **Assertion**: John Howard 的基准测试中，Istio 和 kgateway 在所有测试项中均无问题（✅）。其他实现各有严重问题。
- **Evidence**: [E8 / F8] — *"Istio: ✅ No issues were found."*（kgateway 同理）
- **Source**: https://github.com/howardjohn/gateway-api-bench [T2]
- **Scope**: 基准测试 v2
- **Certainty**: Medium-High

---

## Step 2 — Relation Edges

### Cross-Topic / Cross-Condition / Cross-Time Edges

**EDGE-01** — Conformance ≠ Production-readiness
- **Type**: contradicts
- **Nodes**: N3 ↔ {N9, N10, N11, N12}
- **Rationale**: N3 列出 13 个 conformant 控制器，暗示 Gateway API 已生产就绪。但 N9（Envoy Gateway 流量中断）、N10（Nginx 吞吐量 1/20）、N11（Traefik namespace 违规）、N12（Cilium 配置不可更新）表明，通过 conformance 测试仅保证 API 正确实现，远不能保证生产级性能和安全性。
- **Evidence**: E3 ↔ E8

**EDGE-02** — Annotation 覆盖严重不足
- **Type**: qualifies
- **Nodes**: N5 ← N22
- **Rationale**: N5 声称 Ingress2Gateway 支持 30+ annotations 自动迁移；N22 指出已知 annotations 总量为 119+。自动迁移覆盖率 ≈25%，剩余 75% 需人工处理。N23（生产环境典型 Ingress 10-15 annotations）进一步说明，即使"小型迁移"，也大概率涉及 Ingress2Gateway 不覆盖的 annotations。
- **Evidence**: E4, E16

**EDGE-03** — 自动迁移工具有"诚实但受限"的特征
- **Type**: supports
- **Nodes**: N5 → N6
- **Rationale**: N5 有集成测试验证行为等价性，N6 确认不支持转换时会输出 WARN。两者共同表明 Ingress2Gateway 在设计和实现上的"fail informative"模式——不静默降级，但对无法覆盖的功能提供显式告警。
- **Evidence**: E4, E5

**EDGE-04** — Ingress NGINX EOL 与 annotation 覆盖缺口形成时间压力
- **Type**: temporal_shift
- **Nodes**: N18 → EDGE-02（N5 ← N22）
- **Rationale**: N18 确认 Ingress-NGINX 已于 2026-03 EOL。但 EDGE-02 显示 annotations 自动迁移覆盖不完备。这意味着团队面临"必须在工具不完善的情况下开始迁移"的现实——无法等到 Ingress2Gateway 覆盖全部 119+ annotations 后再迁移，因为 Ingress-NGINX 不再有安全修补。
- **Evidence**: E12, E4, E16

**EDGE-05** — Gateway API 解决 Ingress 权限模型缺陷
- **Type**: supports
- **Nodes**: N16 → N17
- **Rationale**: N16 列出 Ingress API 三限之一：权限模型不足。N17 确认 Gateway API 通过四个显式角色精确解决该问题。这是 Gateway API 相对于 Ingress 最清晰的增量价值之一。
- **Evidence**: E11

**EDGE-06** — Annotation lock-in vs Custom CRD lock-in
- **Type**: tradeoff
- **Nodes**: N15 ↔ N16.ingress_annotation_dependency
- **Rationale**: N16 指出 Ingress 依赖 annotations 导致不可移植；N15 指出 Gateway API 各实现引入自有 CRDs 也造成 vendor lock-in。用户面临的选择不是"有无 lock-in"，而是"哪种 lock-in 更容易管理"——annotation lock-in（Ingress）通过迁移工具可部分解除，custom CRD lock-in（Gateway）则需重新实现。
- **Evidence**: E11, E10

**EDGE-07** — Zero-install vs Rich API
- **Type**: tradeoff
- **Nodes**: N13 ↔ N16
- **Rationale**: N13 指出 Gateway API 不自带（需额外安装 CRDs），N16 指出 Ingress 功能有限但无需额外安装。两者构成运维开销与功能丰富度之间的经典 tradeoff。
- **Evidence**: E9, E11

**EDGE-08** — 标准成熟 ≠ 生态成熟
- **Type**: qualifies
- **Nodes**: {N1, N2} ← {N7, N13, N14, N19}
- **Rationale**: N1+N2 从标准层证明 Gateway API 已达到 GA 并持续演进。但 N7（简单事情变难）、N13（CRDs 安装开销）、N14（控制器选择困难）、N19（Helm 不成熟）共同指出生态成熟度落后于标准成熟度。这构成"标准可用但使用体验仍有 gap"的复合关系。
- **Evidence**: E1, E2, E6, E9, E13

**EDGE-09** — TLS 集成死锁是一个特定但高影响的问题
- **Type**: qualifies
- **Nodes**: N21 ← N8
- **Rationale**: N21 推荐 side-by-side 逐步迁移策略。但 N8 描述的 TLS+ExternalDNS 死锁可能在迁移过程中出现——即便 side-by-side 运行，一旦过渡到 Gateway API 管理的流量，cert-manager + http-01 场景会触发死锁。迁移路径规划时需考虑此阻塞项。
- **Evidence**: E15, E7

**EDGE-10** — 控制器选择困难 + vendor lock-in 形成复合决策障碍
- **Type**: supports
- **Nodes**: N14 → N15
- **Rationale**: N14 指出控制器选择是最困难的部分；N15 指出一旦选择，可能被实现的自有 CRDs 锁定。二者叠加使得迁移决策比"是否迁移"本身更复杂——还需回答"迁移到哪个控制器"。
- **Evidence**: E9, E10

**EDGE-11** — Gateway API 版本演进加速
- **Type**: depends_on
- **Nodes**: N1 → N2
- **Rationale**: N1 的 v1.4.0 GA 是 N2 的 v1.5.0 的基础，后者被称为"迄今为止最大版本"。版本演进节奏（~4 个月从 v1.4 到 v1.5）说明项目处于活跃发展阶段。
- **Evidence**: E1, E2

**EDGE-12** — Istio/kgateway 作为性能基准参照
- **Type**: qualifies
- **Nodes**: N24 ← {N9, N10, N11, N12}
- **Rationale**: N24 标识 Istio 和 kgateway 在基准测试中无问题，这使得 N9-N12 中的实现性能问题更突显——不是"Gateway API 整体性能差"，而是"特定实现存在严重问题"。
- **Evidence**: E8

**EDGE-13** — 三层 Conformance 模型纵容纳实现差异
- **Type**: supports
- **Nodes**: N20 → {N15, N3, N4}
- **Rationale**: N20 的 Core/Extended/Implementation-specific 三层结构解释了为什么 N3（conformant）和 N4（partially conformant）可以共存，也解释了 N15 的自有 CRDs 现象——各实现通过 Extended 和 Implementation-specific 层引入差异化功能。
- **Evidence**: E14, E3, E10

**EDGE-14** — Migrate-or-Not 是一个"时间 + controller + annotation 复杂度"的三维问题
- **Type**: tradeoff
- **Nodes**: {N18, EDGE-04} ↔ {N7, N13, N14, N19, EDGE-02}
- **Rationale**: 正向拉力（N18 Ingress-NGINX EOL + EDGE-04 时间压力）与反向阻力（N7 复杂度上升 + N13 CRD 运维开销 + N14 选择困难 + N19 Helm 不成熟 + EDGE-02 annotation 覆盖不足）形成一个三维权衡空间。决策不是二元的，而是取决于团队的 annotation 复杂度、目标控制器、和现有运维能力。
- **Evidence**: E12, E6, E9, E13, E4, E16

---

## Step 3 — Conflict Ledger / Gap Ledger

### Material Conflicts

| ID | Conflict | Involved Nodes/Edges | Severity |
|----|----------|---------------------|----------|
| C1 | Conformance 测试通过 vs 实际性能/安全不达标 | N3 vs {N9, N10, N11, N12} via EDGE-01 | High — 直接影响"哪些控制器可用于生产"的判断 |
| C2 | 自动迁移工具声称"支持 30+" vs 实际需要 119+ | N5 vs N22 via EDGE-02 | High — 直接影响迁移实际工作量评估 |
| C3 | Gateway API 设计目标是 vendor-agnostic vs 实现引入自有 CRDs | 设计意图（隐含） vs N15 | Medium — 取决于团队对 lock-in 的敏感度 |
| C4 | 官方说 annotation 扩展 strongly discouraged vs NGINX Gateway Fabric 本身引入 10+ CRDs | N20 vs N15 | Medium — 官方规范和实现实践存在明显不一致 |

### Trade-offs

| ID | Trade-off | Involved Nodes/Edges | Practical Implication |
|----|-----------|---------------------|----------------------|
| T1 | Ingress annotation lock-in vs Gateway custom CRD lock-in | EDGE-06 | 两者都有 lock-in，选择取决于团队的 lock-in 管理能力 |
| T2 | Zero-install simplicity (Ingress) vs richer API (Gateway) | EDGE-07 | 简单场景用 Ingress 更省心，复杂场景 Gateway 收益 > 开销 |
| T3 | Must migrate (Ingress-NGINX EOL) vs migration friction | EDGE-04, EDGE-14 | EOL 不可逆转，但迁移速度需与 annotation 迁移能力匹配 |
| T4 | 单一控制器成熟（e.g. Istio ✅）vs 通用性 | EDGE-12 | 选择 Istio/kgateway 可规避多数性能问题，但可能不符合已有的基础设施选型 |

### Temporal Shifts

| ID | Shift | Involved Nodes/Edges | Impact |
|----|-------|---------------------|--------|
| TS1 | Pre-2025: Gateway API experimental → 2025-2026: GA with Standard channel | N1, N2, EDGE-11 | 早期对 Gateway API 的质疑（"还太新"）在 v1.4/v1.5 后不再成立 |
| TS2 | Ingress-NGINX active → EOL (2026-03) → security freeze | N18, EDGE-04 | 迁移从"可选的升级"变为"有明确时间窗口的强制迁移" |
| TS3 | Ingress2Gateway 0.x (3 annotations) → 1.0 (30 annotations) | N5 vs E16 中的历史对比 | 工具在快速改进，但当前覆盖仍不足 |

### Scope Constraints

| ID | Constraint | Evidence | Impact |
|----|-----------|----------|--------|
| S1 | E8 基准测试仅对比各 Gateway API 实现间差异，无"同控制器 Ingress vs Gateway"直接对比 | [E8] | 无法回答"从同一控制器的 Ingress 模式迁移到 Gateway API 模式是否引入性能损失" |
| S2 | Q6（不适合迁移的场景）证据严重不足；R1 仅 1 条搜索结果，R3 未找到反证 | [Q6 Highlights] | 无法从证据层面充分回答"什么场景应该明确不迁移" |
| S3 | Gateway API 反证几乎全部来自单一人 T3 来源（henrikgerdes.me） | N7, N8, N13, N14, N15 均引用 [F4] | 虽论点有工程深度，但缺乏独立交叉验证 |
| S4 | 无回滚实践经验证据 | [Q3 R3 未找到反证] | 迁移风险分析缺少"迁移失败后的恢复成本"数据 |

### Evidence Gaps

| ID | Gap | Priority | Implication |
|----|-----|----------|-------------|
| G1 | 无"Gateway API vs 同控制器 Ingress"性能 benchmark | High — 直接影响迁移决策的延迟/吞吐评估 | 需团队自行建立迁移前后的性能基线 |
| G2 | 无多来源验证的反证（仅 T3 来源） | Medium — 虽真实感强但不可外推 | 结论置信度受限于证据多样性的不足 |
| G3 | "不适合场景"无反证数据（Q6） | High — 核心问题不可答 | 无法给出"哪些团队应推迟迁移"的充分证据 |
| G4 | 无回滚/迁移事故经验数据 | Medium — 风险评估不完整 | 迁移规划中需预留比当前证据建议更大的 buffer |
| G5 | 无 Ingress-NGINX 退役公告原文（F9 fetch failed） | Low — 被 T2/T3 来源交叉覆盖 | Ingress-NGINX EOL 事实本身置信度仍为 High |

---

## Step 4 — Final Answer

### 核心判断：Gateway API 是否值得从 Ingress 迁移？

**答案不是"是/否"二元选择，而是一个三维权衡空间的边界定位问题**[EDGE-14]。基于 Evidence Nodes、Edges 和 Ledgers，给出以下结构化判断：

---

#### 维度一：标准成熟度 — ✅ 已满足迁移的基本前提

Gateway API 在标准层已充分成熟。v1.4.0 GA [N1] 和 v1.5 六项 feature 升级到 Standard [N2] 提供了核心 API 的生产级稳定性承诺。版本演进节奏活跃（4 个月从 v1.4 到 v1.5）[EDGE-11]。**但标准成熟不等于生态成熟**[EDGE-08]——CRD 安装开销 [N13]、控制器选择困难 [N14]、Helm 生态不成熟 [N19] 仍构成使用体验上的显著 gap。

**关键判断条件**：如果团队能接受"标准成熟 + CRD 管理开销"的 setup，标准层不构成迁移障碍；如果期望"开箱即用"体验，需等待生态成熟。

---

#### 维度二：控制器兼容性 — ⚠️ Conformance 通过不等于生产就绪

13 个控制器已通过 conformance 认证 [N3]，但 EDGE-01 揭示的冲突是这条维度最重要的发现：**Conformance 测试仅保证 API 正确实现，不保证性能和安全行为**[C1]。具体而言：

- **Istio 和 kgateway** 在基准测试中无任何问题 [N24]，是当前最可靠的控制器选项 [EDGE-12]。
- **NGINX Gateway Fabric** 吞吐量仅为中位值的 1/20 且可能崩溃 [N10]——这对从 Ingress-NGINX 迁出的团队是反直觉的：同名产品不保证同性能。
- **Traefik** 违反 namespace 隔离假设 [N11]，在多租户集群场景中可能是安全阻塞项。
- **Cilium** 在 Envoy 配置 >1.5MB 后无法更新 [N12]——在大规模多服务集群中可能触发。
- **Envoy Gateway** 路由更新时出现服务中断 [N9]。

同时，Gateway API 的 vendor-agnostic 设计目标与实际实现存在矛盾：各控制器的自有 CRDs [N15] 在弥补核心 API 功能空白的同时，也造成了另一种 vendor lock-in [EDGE-06]。三层 conformance 模型 [N20] 在标准层面允许这种差异，但用户需要参照兼容性矩阵做选择 [EDGE-13]。

**关键判断条件**：选择控制器本身是独立于"是否迁移"的决策节点。如果意向控制器是 Istio 或 kgateway，性能风险较低；如果意向控制器是 NGINX Gateway Fabric 或 Traefik，需额外验证。

---

#### 维度三：迁移风险 — ⚠️ Annotation 覆盖是核心瓶颈，并非无法解决

迁移工具链有明确进步：
- Ingress2Gateway v1.0 支持 30+ annotations 自动转换且通过集成测试验证等价性 [N5]。
- 迁移推荐策略为 side-by-side 逐步切换 [N21]，降低了一次性迁移的风险。
- Ingress-NGINX EOL [N18] 产生时间压力 [EDGE-04]，但也是外部强制力。

但核心瓶颈在 annotation 覆盖缺口 [C2]：已知 119+ annotations vs 仅 30 个可自动转换 [N22]，覆盖率 ≈25%。`configuration-snippet`、`proxy-body-size` 等 production 常用注解完全无法自动转换 [N6]。即使一个典型生产 Ingress（10-15 个 annotations）[N23]，也大概率涉及超出自动覆盖范围的注解。

此外，TLS + ExternalDNS 死锁 [N8] 是一个特定场景（cert-manager + http-01）的高影响阻塞项，且可能破坏 side-by-side 迁移策略的平滑性 [EDGE-09]。Helm 生态不成熟 [N19] 增加了迁移后的运维修复成本。

值得注意的是，Ingress2Gateway 的 WARN 输出设计 [EDGE-03] 至少保证了迁移工具不会静默产生不正确的配置——但"knowingly incomplete"并不降低实际迁移的人工成本。

**关键判断条件**：迁移的实际工作量取决于当前 Ingress annotations 集合与 Ingress2Gateway 覆盖集的重叠度。需先执行 annotation 清单审计，再做迁移工作量评估。EOL 时间压力不能作为忽略 annotation 审计的理由。

---

#### 维度四：适用场景 — 角色分离和高级路由是核心优势，简单场景收益有限

**适合优先迁移的场景**（根据现有证据合理推断）：
1. 多团队共享集群：Gateway API 的四角色模型 [N17] 直接解决了 Ingress 的权限模型缺陷 [N16]。
2. 需要高级路由：TLS 双向认证、CORS、后端 TLS、金丝雀发布——这些在 Ingress 靠 annotations hack 的功能 [N16] 在 Gateway API 可通过标准化 API 完成 [N1, N2]。
3. Ingress-NGINX annotations 用量简单的团队（<30 个已知覆盖注解、无 configuration-snippet 等）。在这种情况下，EDGE-04 的时间压力和 N5 的工具支持使得迁移路径相对清晰。

**⚠️ 不适合优先迁移的场景**（受证据缺口 G3 限制，以下为基于现有证据的推演，非充分证据支撑）：
- 单团队单集群、路由规则简单（<5 条规则）的场景：Gateway API 的 CRD 安装 [N13] + 控制器选择 [N14] + Helm 模板定制 [N19] 的固定成本可能超过收益 [EDGE-07]。Ingress-NGINX EOL [N18] 需要解决，但可能选择直接替换控制器而非迁移到 Gateway API——这是一个仍然开放的替代路径。
- 重度依赖 Ingress-NGINX-specific annotations（configuration-snippet、proxy-body-size 等）的集群：自动迁移覆盖严重不足 [EDGE-02]，迁移周期将显著拉长，需仔细评估与 Ingress-NGINX EOL 时间窗口的匹配度 [EDGE-04]。

---

#### 综合判断

| 评估维度 | 评分 | 核心证据 |
|----------|------|----------|
| 标准成熟度 | ✅ 充足 | N1, N2, EDGE-11 |
| 控制器兼容性 | ⚠️ 需细粒度评估 | N3, N4, N9–N12, N24, EDGE-01 |
| 迁移风险（工具） | ⚠️ 可管理但覆盖不足 | N5, N6, N22, N23, EDGE-02 |
| 迁移风险（运维） | ⚠️ 存在特定陷阱 | N8, N13, N19, EDGE-09 |
| 增量价值（复杂场景） | ✅ 显著 | N16, N17, N1, N2 |
| 增量价值（简单场景） | ❌ 证据不足 | G3, G2, S2 |

**总体推荐**：
- 对多团队集群/高级路由团队：**建议启动迁移**，但控制器选型需单独评估（Istio/kgateway 推荐），且迁移前必须完成 annotation 审计。
- 对简单的单团队集群：**建议仔细评估**，Ingress-NGINX EOL 不可忽视，但 Gateway API 在当前阶段不一定是最佳替代——需对比其他控制器（Cilium、Istio 等原生 Ingress 能力）后再做决定。
- **所有团队**：迁移前应建立性能/可观测性基线 [N21]，另须检查是否使用 cert-manager + http-01（会触发 N8 死锁，需改用 dns-01）。

**总体置信度**: Medium。T1 来源提供可靠的标准层和工具信息，但反证几乎全部来自单一 T3 来源 [S3]，"不适合迁移场景"缺乏任何实质证据 [G3]，且缺少回滚实践经验 [G4] 和同条件性能对比 [G1]。

---

### 证据缺口总结（供后续研究参考）

| 缺口 | 优先级 | 推荐的搜索策略 |
|------|--------|---------------|
| 同控制器 Ingress vs Gateway API 性能对比 | High | 需部署实验或深入查阅特定控制器的版本发布说明 |
| 多来源交叉验证的反证 | Medium | 搜索"Gateway API migration regret"、"we went back to Ingress"等 |
| 不适合场景的证据 | High | 替换搜索策略，用"Gateway API overkill"、"we stayed with Ingress"替代"when NOT to use" |
| 回滚/迁移事故经验 | Medium | 搜索"Gateway API migration rollback"、"failed Gateway API migration" |
| Ingress-NGINX 退役公告原文 | Low | 手动 retry fetch（临时性不可用） |

---

*本文档仅基于给定 evidence pool（E1-E16）撰写，未使用外部资料。所有断言、关系、冲突分析均回链到 evidence_id、node_id 或 edge_id。*