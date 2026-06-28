# Run 13 — Run A Output

> **问题**: Kubernetes Gateway API 是否值得从 Ingress 迁移：成熟度、控制器兼容性、迁移风险与适用场景
> **日期**: 2026-06-25

---

## 核心结论

Kubernetes Gateway API 在标准成熟度上已具备迁移的基本条件，但其迁移决策不是"是/否"的二元选择，而是一个依赖控制器选择、annotation 覆盖度和运维能力的三维权衡。以下从四个维度展开分析。

---

## 一、成熟度：已 GA 但生态仍在追赶

Gateway API 的标准成熟度在过去一年取得了实质性进展。v1.4.0 于 2025 年 10 月达到 General Availability（GA）[E1]，v1.5.0 在 2026 年 2 月进一步将 ListenerSet、TLSRoute、HTTPRoute CORS Filter、Client Certificate Validation、Certificate Selection、ReferenceGrant 共六项 Experimental features 升级到 Standard channel [E2]。这标志着核心 API 层已脱离实验阶段，具备生产级稳定性承诺。

然而，成熟度的现实判断需要区分"标准成熟"和"生态成熟"。Gateway API 不随 Kubernetes 一同发货，需要额外通过 CRDs 安装，且对 server-side apply 有依赖 [E9]。控制器选择本身被社区称为"最困难的部分之一"[E9]。此外，T3 来源的一位有实际迁移经验的工程师给出的讽刺性总结"Gateway API makes hard things possible — but easy things hard"[E6] 揭示了标准成熟与使用体验成熟之间存在落差。

一个不可忽视的外部驱动因素是 Ingress-NGINX 已于 2026 年 3 月达到 EOL，安全补丁即将停止 [E12]。这意味着对于仍在使用 Ingress-NGINX 的集群，"是否迁移"正逐渐变成"何时迁移"的问题。但需要清醒地看到：当前对 Gateway API 的反证几乎全部来自单一 T3 来源 [E6, E7, E9, E10]，虽然其论点有实践深度，但缺乏多个独立来源的交叉验证。

**证据缺口**: 关于"什么场景不适合迁移"（Q6），搜索结果严重不足——其中一条 T4 来源仅提出"If your requirement is simple..."的泛泛论述且可靠性低，R3 反证搜索未找到明确保留 Ingress 的理由 [Q6 Highlights]。这意味着目前无法充分回答"哪些场景应该明确不迁移"，这一判断主要依赖团队对自身复杂度的认知。

---

## 二、控制器兼容性：Conformance 不等于生产就绪

根据官方实现列表，截至 v1.5 发布时，Cilium、GKE、HAProxy Ingress、Istio、kgateway、NGINX Gateway Fabric、Traefik Proxy 等已通过 Conformance 认证；Contour、Envoy Gateway、Kong 则为 Partially Conformant [E3]。从兼容性覆盖面来看，主流控制器均已支持 Gateway API。

但 John Howard（Istio 维护者）的独立基准测试揭示了巨大的实现质量差异 [E8]：Istio 和 kgateway 在所有测试中无问题（✅）；Cilium 在生成的 Envoy 配置超过 1.5MB（etcd 限制）后无法更新代理配置；Envoy Gateway 在路由更新时出现临时流量中断；**Nginx（NGINX Gateway Fabric）的吞吐量是中位值的 1/20，且可能因处理有效 HTTPRoutes 而崩溃**；Traefik 将所有 namespace 的 Gateway 合并到单一共享组件，违背了 namespace 隔离的安全假设 [E8]。这意味着 Conformance 测试通过仅保证 API 正确实现，远不能保证性能和安全行为达到预期。

此外，Gateway API 的设计目标是 vendor-agnostic，但各实现为了弥补核心 API 尚未覆盖的功能（如 auth、mTLS），引入了大量自有 CRDs——NGINX Gateway Fabric 已有 10+ 自有 CRDs，Kong 和 Envoy Gateway 也有类似做法 [E10]。这实际上造成了另一种 vendor lock-in 的可能，与迁移初衷形成张力。Gateway API 定义的"三层 conformance 模型"（Core / Extended / Implementation-specific）也明确了这一点：Extended 和 Implementation-specific 特性的支持因实现而异 [E14]。

**证据缺口**: 无直接对比"Gateway API vs Ingress 同控制器"的性能 benchmark [E8 来源仅测试 Gateway API 各实现间对比]。因此无法从数据层面判断"从 Ingress 切换到同一控制器的 Gateway API 实现"是否引入性能损失。

---

## 三、迁移风险：自动工具有限，annotation 覆盖是核心瓶颈

迁移工具链已有显著进步。Ingress2Gateway 1.0 于 2026 年 3 月发布，支持 30+ Ingress-NGINX annotations 的自动转换（包括 CORS、backend TLS、regex matching、path rewrite 等），且有集成测试验证行为等价性 [E4]。Datadog 的迁移指南和 GKE 官方文档均推荐逐步迁移策略：先安装 Gateway API 控制器与 Ingress-NGINX 共存，捕获性能基线，逐步转换流量，最后做流量切换 [E15]。

但自动化覆盖的局限性是迁移风险的核心。独立社区项目 ing-switch 映射了 119+ Ingress-NGINX annotations 并给出 impact ratings [E16]，这意味着 Ingress2Gateway 当前仅覆盖约 25% 的已知 annotations。具体而言，`configuration-snippet`、`proxy-body-size` 等 production 环境常用注解无法直接转换到 Gateway API，工具会输出 WARN 提示 [E5]。一位社区作者指出："the real complexity isn't swapping controllers — it's the annotations. A typical production Ingress has 10-15 NGINX annotations for SSL, auth, rate limiting, CORS, session affinity, and more." [Q5 Highlights]。

另一个运维层面的风险是 Helm chart 生态尚不成熟。即使新版本 `helm create` 可生成 HTTPRoute 模板，"creating a good general helm template for HTTPRoutes is quite hard"[E13]，多数 Helm charts 尚未原生支持 HTTPRoutes。这意味着迁移后可能需要维护自定义模板。

此外还存在一个值得注意的技术陷阱：Gateway API 的 TLS + ExternalDNS 集成存在循环依赖问题——listener 因无证书不健康 → HTTPRoute 不可被引用 → ExternalDNS 不可用 → http-01 challenge 无法完成。仅 dns-01 challenge 可绕过 [E7]。这虽然是特定场景（自动 TLS 证书颁发）的问题，但对于依赖 cert-manager + http-01 的团队可能是迁移阻塞项。

---

## 四、适用场景：角色分离和高级路由是核心优势，简单场景收益有限

Gateway API 在以下场景有明确的增量价值。从官方定位看，Kubernetes SIG Network 明确列出了 Ingress API 的三大限制：功能有限（仅 HTTP/HTTPS + TLS termination）、依赖 annotations 扩展（导致不可移植）、权限模型不足（不适合多团队集群）[E11]。Gateway API 通过四个显式角色（application developer、application admin、cluster operator、infrastructure provider）解决可移植性的权限分离问题 [E11]，这对多团队或多服务集群有实质吸引力。

Gateway API 的 v1.5 标准化了 TLSRoute 和 HTTPRoute CORS Filter [E2]，加上 v1.4 的 BackendTLSPolicy [E1]，使得高级路由场景（TLS 双向认证、后端 TLS 配置、跨域策略）可在标准化 API 层完成，不再依赖非移植的 annotations。对于需要细粒度流量分割、金丝雀发布、Header-based routing 的团队，Gateway API 的表达力可以显著减少 annotation hack 的维护负担。

但反过来的推论同样成立：对于已在使用 Ingress-NGINX 且 annotations 使用简单的单一路由场景，迁移的实际收益有限。Gateway API 不随 Kubernetes 发货、需要独立安装 CRDs、控制器选择需要评估、Helm 生态尚不成熟 [E9, E13]，这本身就是一笔固定的迁移成本。Ingress-NGINX 被描述为"a dead simple solution that just works"[E6]，对于复杂度的团队，这种简单性本身就是价值。

适合优先迁移的场景包括：多团队共享集群（需要角色分离）、已使用或计划使用高级路由（TLS 双向认证、CORS、后端 TLS）、或 Ingress-NGINX annotations 覆盖简单（<15 个且可以通过 Ingress2Gateway 直接转换）。不适合优先迁移的场景因 Q6 证据严重不足 [Q6 Highlights]，无法给出充分论证。

---

## 五、总结判断

Gateway API 从标准成熟度上看已值得认真考虑迁移，但并非所有场景都应在当前窗口期执行。Ingress-NGINX 退役 [E12] 产生了一定的时间紧迫性，而 Ingress2Gateway 工具 [E4] 和 side-by-side 迁移策略 [E15] 为迁移提供了可操作路径。然而，控制器实现之间的性能差异 [E8]、annotation 覆盖不完备 [E16]、Helm 生态不成熟 [E13]、以及 TLS 集成特定场景的死锁问题 [E7] 构成了迁移的实质性风险。团队需要根据自身 annotation 复杂度、控制器偏好和运维能力，做个案评估而非一刀切决策。

**总体置信度**: Medium。T1 来源丰富（K8s 官方博客、官方文档）提供可靠的标准层信息，但反证几乎全部来自单一 T3 来源，且"不适合迁移的场景"缺乏充分证据。

---

*本文档仅基于给定 evidence pool（E1-E16）撰写，未使用外部资料。*