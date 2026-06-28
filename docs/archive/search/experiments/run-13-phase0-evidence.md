# Run 13 — Phase 0 Evidence Pool

> **Query**: Kubernetes Gateway API 是否值得从 Ingress 迁移：成熟度、控制器兼容性、迁移风险与适用场景
> **Tier**: L3 — Deep Research
> **Date**: 2026-06-25
> **Mode**: Phase 0 evidence collection only（不做最终答案）

---

## Phase 1: Search Plan

### Decomposed Sub-Questions

| ID | 主题 | 假设（待验证） |
|----|------|---------------|
| **Q1** | Gateway API 标准成熟度（GA 状态、版本演进、核心 API 稳定性承诺） | 假设：Gateway API 已 GA 或接近 GA，标准趋于稳定 [unverified] |
| **Q2** | 主流控制器兼容性（nginx-ingress、Istio、Contour、Traefik、HAProxy 等） | 假设：nginx-ingress 和 Istio 对 Gateway API 实现最成熟 [unverified] |
| **Q3** | 迁移路径与实践案例（工具、社区经验、回滚方案） | 假设：已有自动化迁移工具（如 Ingress2Gateway），但迁移存在一定风险 [unverified] |
| **Q4** | 性能与运维开销对比（延迟、资源消耗、运维复杂度） | 假设：Gateway API 代理层增加可能带来额外延迟 [unverified] |
| **Q5** | 功能覆盖度反向映射（Ingress 已有功能能否被 Gateway API 等价实现） | 假设：Ingress 的 annotation-based 配置反向映射到 Gateway API 不完全等价 [unverified] |
| **Q6** | 不适合迁移的场景（保留 Ingress 的理由） | 假设：简单场景（单一路由、Basic auth 即可）不值得迁移 [unverified] |

### 3-Route Fanout (per sub-Q)

| Sub-Q | Route | Query | 预期信息增益 | 期望主要来源类型 |
|-------|-------|-------|--------------|------------------|
| Q1 | R1 | "Kubernetes Gateway API GA maturity production ready 2025 2026" | High | T1 官方 |
| Q1 | R2 | "Gateway API stability GA" (site:kubernetes.io OR site:gateway-api.sigs.k8s.io OR site:github.com/kubernetes-sigs/gateway-api) | High | T1 官方/T2 项目 |
| Q1 | R3 | "Gateway API not ready production limitations" OR "Gateway API criticism problems" | Medium | T3 社区 |
| Q2 | R1 | "Gateway API controller compatibility nginx istio contour traefik haproxy" | High | T2 社区 |
| Q2 | R2 | "Gateway API implementation" (site:kubernetes.io OR site:istio.io OR site:projectcontour.io OR site:traefik.io OR site:nginx.com) | High | T1 官方 |
| Q2 | R3 | "Gateway API controller missing features" OR "ingress controller does not support Gateway API" | Medium | T3 社区 |
| Q3 | R1 | "Kubernetes Ingress to Gateway API migration guide best practices" | High | T2 社区/T3 博客 |
| Q3 | R2 | "migrate from Ingress to Gateway API" (site:kubernetes.io OR site:reddit.com OR site:news.ycombinator.com) | High | T2 社区 |
| Q3 | R3 | "Ingress to Gateway API migration problems rollback" OR "迁移Gateway API 踩坑" | Medium | T3 真实事故贴 |
| Q4 | R1 | "Gateway API performance overhead latency benchmark" | Medium | T3 社区 |
| Q4 | R2 | "Gateway API performance benchmark" (site:kubernetes.io OR site:github.com OR site:reddit.com) | Medium | T2 社区 |
| Q4 | R3 | "Gateway API slower than Ingress" OR "Gateway API latency overhead" | Low | T3 社区 |
| Q5 | R1 | "Gateway API vs Ingress feature comparison annotation support" | High | T2 社区 |
| Q5 | R2 | "Gateway API Ingress comparison" (site:kubernetes.io OR site:gateway-api.sigs.k8s.io OR site:reddit.com) | High | T1 官方/T2 社区 |
| Q5 | R3 | "features Ingress supports Gateway API missing" OR "Ingress annotation not supported Gateway API" | Medium | T3 社区 |
| Q6 | R1 | "when NOT to use Gateway API keep Ingress simple use case" | Medium | T3 社区 |
| Q6 | R3 | "why we stayed with Ingress instead of Gateway API" OR "Gateway API overkill simple routing" | Medium | T3 真实经验 |

---

## Phase 2: Search Results & fetch_content 全文归档

### 2.1 搜索结果总表

| Sub-Q | Route | Query | 搜索引擎结果数 | 关键结果 |
|-------|-------|-------|-------------|--------|
| Q1 | R1 | "Kubernetes Gateway API GA maturity production ready 2025 2026" | 10 | devstarsj.github.io (T3), k8s-ops.net (T3), kubernetes.io/blog/gateway-api-v1-4 (T1), kubernetes.io/blog/gateway-api-v1-5 (T1) |
| Q1 | R2 | "Gateway API stability GA" site:kubernetes.io OR site:gateway-api.sigs.k8s.io OR site:github.com/kubernetes-sigs/gateway-api | 10 | github.com/kubernetes-sigs/gateway-api (T1), gateway-api.sigs.k8s.io (T1) |
| Q1 | R3 | "Gateway API not ready production limitations criticism problems" | 10 | henrikgerdes.me/blog/2026-01-gateway-api-exp-1 (T3, 反证) |
| Q2 | R1 | "Gateway API controller compatibility nginx istio contour traefik haproxy envoy" | 10 | gateway-api.sigs.k8s.io/docs/implementations/list (T1) |
| Q2 | R2 | "Gateway API implementation" site:kubernetes.io OR site:istio.io OR site:projectcontour.io OR site:traefik.io OR site:nginx.com | 10 | istio.io (T1), projectcontour.io (T1), traefik.io (T1), nginx.com (T1) |
| Q2 | R3 | "Gateway API controller missing features OR ingress controller does not support Gateway API" | 10 | microsoft.com/en-us/azure/aks (T2), gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress-nginx (T1) |
| Q3 | R1 | "Kubernetes Ingress to Gateway API migration guide best practices 2026" | 10 | kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release (T1), datadoghq.com/blog/migrate-to-gateway-api (T2) |
| Q3 | R2 | "migrate from Ingress to Gateway API" site:kubernetes.io OR site:reddit.com OR site:news.ycombinator.com | 10 | kubernetes.io/blog/2025/11/11/ingress-nginx-retirement (T1, fetch failed), news.ycombinator.com/item?id=47154654 (T2), reddit.com (T3) |
| Q3 | R3 | "Ingress to Gateway API migration problems rollback OR 迁移 Gateway API 踩坑" | 10 | datadoghq.com/blog/migrate-to-gateway-api (T2), youngju.dev (T3) |
| Q4 | R1 | "Gateway API performance overhead latency benchmark comparison Ingress" | 10 | github.com/howardjohn/gateway-api-bench (T2) |
| Q4 | R2 | "Gateway API performance benchmark" site:kubernetes.io OR site:github.com OR site:reddit.com | 10 | github.com/howardjohn/gateway-api-bench (T2) |
| Q4 | R3 | "Gateway API slower than Ingress OR Gateway API latency overhead" | 10 | medium.com (T4, DOWNRANK — Goggle A) |
| Q5 | R1 | "Gateway API vs Ingress feature comparison annotation support" | 10 | linkedin.com (T3), gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress (T1) |
| Q5 | R2 | "Gateway API Ingress comparison" site:kubernetes.io OR site:gateway-api.sigs.k8s.io OR site:reddit.com | 10 | gateway-api.sigs.k8s.io/faq (T1), reddit.com/r/kubernetes (T3) |
| Q5 | R3 | "features Ingress supports Gateway API missing OR Ingress annotation not supported Gateway API" | 10 | kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release (T1), github.com/kubernetes-sigs/ingress2gateway (T1) |
| Q6 | R1 | "when NOT to use Gateway API keep Ingress simple use case" | 1 | reddit.com (T3) — **不足：仅 1 条结果** |
| Q6 | R3 | "why we stayed with Ingress instead of Gateway API OR Gateway API overkill simple routing" | 10 | medium.com (T4), tigera.io (T2), navendu.me (T3) — **R3 无明确反证** |

**R3 反证可达性标注**：
- Q1 R3: ✅ 有反证（henrikgerdes.me — "Gateway API makes hard things possible - but easy things hard"）
- Q2 R3: ⚠️ 部分（搜索结果多为迁移指南，缺少"哪些控制器不支持"的明确信息）
- Q3 R3: ⚠️ 部分（搜索结果偏重迁移指南正面的回滚/失败经验）
- Q4 R3: ❌ [未找到反证] — 没有找到明确的"Gateway API 比 Ingress 慢"的 benchmark 数据
- Q5 R3: ✅ 有反证（ingress2gateway 明确列出了不支持转换的 annotations）
- Q6 R1: ❌ [不足] — 仅 1 条搜索结果，不足以覆盖"什么场景不适合迁移"这个子问题
- Q6 R3: ❌ [未找到反证] — 搜索结果为对比文章，未找到"继续使用 Ingress 的理由"

### 2.2 fetch_content 全文归档

#### 归档块 F1: Kubernetes Gateway API v1.4 官方发布

- **URL**: https://kubernetes.io/blog/2025/11/06/gateway-api-v1-4/
- **状态**: ✅ 成功（12,000 chars）
- **摘要**: Gateway API v1.4.0 GA release 于 2025 年 10 月 6 日发布。新增三项 Standard 特性：BackendTLSPolicy（Gateway 到后端间的 TLS 配置）、supportedFeatures（GatewayClass 状态声明支持的特性）、Named rules for Routes。Experimental 新增：Mesh resource、Default Gateways、ExternalAuth filter for HTTPRoute。
- **完整正文**: [参见上方 fetch_content 返回]

#### 归档块 F2: Kubernetes Gateway API v1.5 官方发布

- **URL**: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/
- **状态**: ✅ 成功（12,000 chars）
- **摘要**: Gateway API v1.5 于 2026 年 2 月 27 日发布，是迄今为止最大的版本。六项 Experimental features 升级到 Standard：ListenerSet、TLSRoute、HTTPRoute CORS Filter、Client Certificate Validation、Certificate Selection for Gateway TLS Origination、ReferenceGrant。引入 release train 发布模型。
- **完整正文**: [参见上方 fetch_content 返回]

#### 归档块 F3: Gateway API 实现列表（官方文档）

- **URL**: https://gateway-api.sigs.k8s.io/docs/implementations/list/
- **状态**: ✅ 成功（12,000 chars）
- **摘要**: 列出所有 Gateway API conformant / partially conformant 实现。Conformant Gateway 控制器包括：Cilium、Gloo Gateway、GKE、HAProxy Ingress、Istio、kgateway、NGINX Gateway Fabric、Traefik Proxy 等。Partially Conformant 包括：AWS EKS、AWS LB Controller、Contour、Envoy Gateway、Kong。Mesh 实现：Istio、Cilium conformant。
- **完整正文**: [参见上方 fetch_content 返回]

#### 归档块 F4: Gateway API 反证 — Henrik Gerdes 个人博客

- **URL**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/
- **状态**: ✅ 成功（10,000 chars）
- **摘要**: T3 个人反证。核心论点：Gateway API 让困难的事情变得可能，但让简单的事情变难。TLS 证书与 ExternalDNS 之间的死锁问题；Gateway API 不是 vendor-agnostic（各实现在引入自有的 CRDs）；Gateway API 需要额外安装 CRDs 且不随 Kubernetes 发货；Ingress-Nginx 用 110+ annotations 覆盖了丰富的功能；Ingress-Nginx 是一个"dead simple solution that just works"。
- **完整正文**: [参见上方 fetch_content 返回]

#### 归档块 F5: Gateway API 迁移指南（官方文档）

- **URL**: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/
- **状态**: ✅ 成功（12,000 chars）
- **摘要**: 官方迁移指南。明确列出 Ingress API 三大限制：功能有限、依赖 annotations 扩展性（导致不可移植）、权限模型不足（不适合多团队集群）。详细对比了 Personas（Ingress 1 个 → Gateway API 4 个）。功能映射：入口点 → Gateway 的 listeners、TLS 终止 → Gateway listener 属性、路由规则 → HTTPRoute。
- **完整正文**: [参见上方 fetch_content 返回]

#### 归档块 F6: Ingress2Gateway 1.0 正式发布（K8s 官方博客）

- **URL**: https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/
- **状态**: ✅ 成功（10,000 chars）
- **摘要**: Ingress2Gateway 1.0 支持 30+ Ingress-NGINX annotations 转换（包括 CORS、backend TLS、regex matching、path rewrite 等）。有完整的集成测试验证行为等价性。工具无法配置的注解会输出 WARN 级别的通知。示例中展示了 proxy-body-size 和 configuration-snippet 等 annotation 无法直接转换。
- **完整正文**: [参见上方 fetch_content 返回]

#### 归档块 F7: Datadog 迁移实践指南

- **URL**: https://www.datadoghq.com/blog/migrate-to-gateway-api/
- **状态**: ✅ 成功（10,000 chars）
- **摘要**: 结构化迁移建议：选择控制器 → 捕获性能基线 → 安装 Gateway API 控制器 → 转换 Ingress 配置 → 验证 Gateway 和 Route 是否被接受 → 验证路由行为 → 逐步迁移生产流量。推荐控制器：NGINX Gateway Fabric、Istio、Envoy Gateway。强调迁移前建立可观测性基线的重要性。
- **完整正文**: [参见上方 fetch_content 返回]

#### 归档块 F8: Gateway API Bench — 性能基准测试

- **URL**: https://github.com/howardjohn/gateway-api-bench/blob/main/README.md
- **状态**: ✅ 成功（全量正文）
- **摘要**: John Howard（Istio 维护者）的独立基准测试（T2 半权威）。测试了 Cilium、Envoy Gateway、Istio、Kgateway、Kong、Traefik、Nginx 七个实现。关键发现汇总表：Istio 和 kgateway 无问题（✅），其他实现各有严重问题。具体见下方证据。
- **完整正文**: [参见上方 fetch_content 返回]

#### 归档块 F9: Ingress NGINX 退役公告（K8s 官方）

- **URL**: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- **状态**: ❌ fetch failed（HTTP error）
- **原因**: 可能临时性不可用

#### 归档块 F10: Gateway API FAQ（官方）

- **URL**: https://gateway-api.sigs.k8s.io/faq/
- **状态**: ✅ 通过搜索结果 snippet 可用
- **摘要**（未 fetch）: FAQ 对比 Ingress vs Gateway API——Ingress 主要面向 HTTP 应用暴露；Gateway API 提供更通用的代理 API，支持更多协议，建模更多基础设施组件。
- **完整正文**: 未 fetch（搜索结果 snippet 足够）

### 2.3 Goggle 打标 & FinalScore 排序

按 §3.5.2 应用 **Goggle A（general-tech）+ Goggle E（zh-tech）** 叠加：

| URL | SearchRank | GoggleWeight | SourceWeight(T-Level) | FinalScore | 备注 |
|-----|-----------|-------------|---------------------|-----------|------|
| kubernetes.io/blog/gateway-api-v1-4 | -1 | +2 (BOOST) | +10 (T1) | +11 | **最高优先** |
| kubernetes.io/blog/gateway-api-v1-5 | -1 | +2 (BOOST) | +10 (T1) | +11 | **最高优先** |
| kubernetes.io/blog/ingress2gateway-1.0 | -1 | +2 (BOOST) | +10 (T1) | +11 | **最高优先** |
| gateway-api.sigs.k8s.io （各类） | -1~5 | +2 (BOOST) | +10 (T1) | +7~+11 | |
| istio.io（Gateway API 文档） | -1 | +2 (BOOST) | +10 (T1) | +11 | |
| nginx.com（NGINX Gateway Fabric） | -1 | +2 (BOOST) | +10 (T1) | +11 | |
| traefik.io（Gateway API 文档） | -1 | +2 (BOOST) | +10 (T1) | +11 | |
| github.com/howardjohn/gateway-api-bench | -1 | +2 (BOOST) | +3 (T2) | +4 | |
| datadoghq.com/blog/migrate-to-gateway-api | -3 | +2 (BOOST) | +3 (T2) | +2 | |
| reddit.com/r/kubernetes | -5 | 0 (—) | +1 (T3) | -4 | |
| henrikgerdes.me （反证） | -3 | 0 (—) | +1 (T3) | -2 | |
| medium.com（各类） | -5~10 | -1 (DOWNRANK) | +0.1 (T4) | -5.9~-10.9 | 低优先 |

---

## Phase 3: Evidence Pool

### Evidence E1 — Gateway API v1.4 已 GA（2025年10月）

- **Claim**: Gateway API 的核心 API 已在 v1.4.0 达到 GA，BackendTLSPolicy、supportedFeatures、Named rules 三个功能进入 Standard channel。
- **Quote**: "The Kubernetes SIG Network community presented the General Availability (GA) release of Gateway API (v1.4.0)! Released on October 6, 2025, version 1.4.0 reinforces the path for modern, expressive, and extensible service networking in Kubernetes."
- **Source**: https://kubernetes.io/blog/2025/11/06/gateway-api-v1-4/ [文档] T1
- **Scope/Version**: v1.4.0, 2025-10-06
- **Tier**: T1 — Kubernetes 官方博客

### Evidence E2 — Gateway API v1.5 六项功能升级到 Standard（2026年2月）

- **Claim**: v1.5 是迄今为止最大的版本，ListenerSet、TLSRoute、HTTPRoute CORS Filter、Client Certificate Validation、Certificate Selection、ReferenceGrant 共六项 Experimental features 升级为 Standard。
- **Quote**: "Gateway API v1.5 brings six widely-requested feature promotions to the Standard channel (Gateway API's GA release channel): ListenerSet, TLSRoute, HTTPRoute CORS Filter, Client Certificate Validation, Certificate Selection for Gateway TLS Origination, ReferenceGrant."
- **Source**: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/ [文档] T1
- **Scope/Version**: v1.5.0, 2026-02-27

### Evidence E3 — Gateway API 成熟度：已有多家控制器实现通过 Conformance 测试

- **Claim**: 多个主流控制器（Cilium、GKE、HAProxy Ingress、Istio、kgateway、NGINX Gateway Fabric、Traefik Proxy）已正式 conformant。Contour、Envoy Gateway、Kong 为 partially conformant。
- **Quote**: "Conformant implementations: Agentgateway, Airlock Microgateway, Calico, Cilium, Gloo Gateway, Google Kubernetes Engine, HAProxy Ingress, Istio, kgateway, NGINX Gateway Fabric, Sunbeam Proxy, Traefik Proxy, Varnish Gateway."
- **Source**: https://gateway-api.sigs.k8s.io/docs/implementations/list/ [文档] T1
- **Scope/Version**: 截至 v1.5 发布（2026年2月）

### Evidence E4 — Ingress2Gateway 1.0 工具可自动化迁移 30+ 注解

- **Claim**: Ingress2Gateway 1.0 支持 30+ Ingress-NGINX annotations（CORS、backend TLS、regex matching、path rewrite 等）转换到 Gateway API，且有集成测试验证行为等价。
- **Quote**: "For the 1.0 release, Ingress2Gateway supports over 30 common annotations (CORS, backend TLS, regex matching, path rewrite, etc.). Each supported Ingress-NGINX annotation, and representative combinations of common annotations, is backed by controller-level integration tests that verify the behavioral equivalence."
- **Source**: https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/ [文档] T1
- **Scope/Version**: Ingress2Gateway v1.0, 2026-03

### Evidence E5 — Ingress2Gateway 存在不支持/无法直接映射的注解

- **Claim**: configuration-snippet、proxy-body-size 等注解无法直接转换到 Gateway API。工具会输出 WARN 提示。
- **Quote**: "Unsupported annotation nginx.ingress.kubernetes.io/configuration-snippet" 和 "Failed to apply my-ns/my-ingress: Most Gateway API implementations have reasonable body size and buffering defaults"
- **Source**: https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/ [文档] T1
- **Scope/Version**: Ingress2Gateway v1.0

### Evidence E6 — Gateway API 反证：让简单的事情变难

- **Claim**: Gateway API 让困难的事情变得可能，但让简单的事情变难。权威反证来自一位有实际迁移经验的工程师。
- **Quote**: "My takeaway: Gateway API makes hard things possible - but easy things hard."
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [社区] T3 — 真实经验
- **Scope/Version**: 2026-01-31
- **反证属性**: ✅ 有反证

### Evidence E7 — TLS + ExternalDNS 死锁问题

- **Claim**: Gateway API 模式下，TLS 证书、DNS 记录、HTTPRoute 之间存在循环依赖：listener 因无证书不健康 → HTTPRoute 不能引用 → ExternalDNS 不可用 → http-01 challenge 无法完成。仅 dns-01 challenge 可绕过。
- **Quote**: "The Gateway handles the TLS, not the HTTPRoute. The default listener likely does not have a valid certificate for your new domain... ExternalDNS watches HTTPRoutes, but only the ones that are ready and have an IP. Now the circle closes, without a valid DNS record, you can't complete a http-01 challenge. It's a deadlock."
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [社区] T3 — 真实经验
- **Scope/Version**: 2026-01-31

### Evidence E8 — Gateway API 性能基准：实现间差异极大

- **Claim**: Istio 和 kgateway 在基准测试中无问题。其他实现各有严重缺陷：Cilium Envoy 配置超 1.5MB 后不可更新；Envoy Gateway 路由更新时泄漏内存；Nginx 吞吐量是中位值的 1/20；Traefik 合并所有 Gateway 到单一组件违反 namespace 安全。
- **Quote**: "Istio: ✅ No issues were found." 和 "Nginx throughput is 20x worse than the median implementation."
  "Traefik consolidates all Gateways, even in different namespaces, onto a single shared component."
  "Cilium: After the generated Envoy configuration reaches 1.5mb (etcd limits), the proxy configuration is unable to be updated."
- **Source**: https://github.com/howardjohn/gateway-api-bench/blob/main/README.md [社区] T2 — 社区权威（Istio 维护者个人项目，但测试方法论公开可复现）
- **Scope/Version**: v2 报告，测试版本截至 2026 年初

### Evidence E9 — Gateway API 增加运维复杂度（CRDs 安装/控制器选择）

- **Claim**: Gateway API 不随 Kubernetes 发货，需要额外安装 CRDs（对 server-side apply 有依赖）。控制器选择本身是"最困难的部分之一"。
- **Quote**: "Ingress is a core component of Kubernetes, the Gateway-API is not shipped with Kubernetes and needs to be installed separately via CRDs."
  "Right now, the selecting a Gateway is actually the hardest part."
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [社区] T3
- **Scope/Version**: 2026-01-31

### Evidence E10 — Gateway API 实现并不完全 vendor-agnostic

- **Claim**: Gateway API 的设计目标是 vendor-agnostic，但各实现引入了自有的 CRDs 和过滤器（nginx-gateway-fabric 有 10+ CRDs、Kong 和 Envoy-Gateway 也有自有的）。由于核心 API 尚未覆盖 auth/mTLS，实现用扩展性来填补空白，可能造成 vendor lock-in。
- **Quote**: "Yes, TLS configuration and routing might be standardized, but the nginx-gateway-fabric for example already brings their own set of 10 CRDs... Gateway API, by design, is extendable and vendors are using this extendibility to overcome the shortcomings of the core API."
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [社区] T3
- **Scope/Version**: 2026-01-31

### Evidence E11 — Ingress API 三大限制（官方确认）

- **Claim**: Kubernetes SIG Network 官方确认 Ingress API 的三项核心限制：功能有限（仅 HTTP/HTTPS + TLS termination）、依赖 annotations 扩展（导致不可移植）、权限模型不足（不适合多团队集群）。Gateway API 通过角色分离解决。
- **Quote**: "Limited features... Reliance on annotations for extensibility... Insufficient permission model."
  "Gateway API includes four explicit personas: the application developer, the application admin, the cluster operator, and the infrastructure providers."
- **Source**: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/ [文档] T1
- **Scope/Version**: 截至 v1.5

### Evidence E12 — Ingress-NGINX 于 2026 年 3 月退役，安全补丁将于 3 月后停止

- **Claim**: Ingress-NGINX 于 2026 年 3 月达到 EOL。IngressNightmare 漏洞（CVE-2025-1974, CVSS 9.8）表明 ingress 漏洞可产生集群级影响。退役后将不再有安全修复。
- **Quote**: "ingress-nginx was archived on March 24, 2026 after a string of critical CVEs including a 9.8 CVSS unauthenticated RCE."（来源：dev.to/mateenali66） 以及 "Ingress NGINX reached end-of-life (EOL)"（来源：datadoghq.com）
- **Source**: https://www.datadoghq.com/blog/migrate-to-gateway-api/ [文档] T2 + dev.to 交叉验证
- **Scope/Version**: 2026-03

### Evidence E13 — Gateway API 的 helm chart / 工具生态尚不成熟

- **Claim**: Helm charts 默认还不支持 HTTPRoutes。即使新版本 helm create 生成了 HTTPRoute 模板，"creating a good general helm template for HTTPRoutes is quite hard"。
- **Quote**: "New technologies need time for adoption, it is totally normal that most helm charts do not yet ship with HTTPRoutes alongside Ingress."
  "Creating a good general helm template for HTTPRoutes is quite hard."
- **Source**: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/ [社区] T3
- **Scope/Version**: 2026-01-31

### Evidence E14 — 控制器功能覆盖度：HTTPRoute core 功能已标准化，但 extended/ext implementation-specific 仍有差距

- **Claim**: Gateway API 定义了三层 conformance：Core（所有实现必须实现）、Extended（可选）、Implementation-specific。官方文档明确了各实现的 extended features 支持列表不统一，用户需要参照兼容性矩阵选择。
- **Quote**: "Extension points do not include annotations on Gateway API resources. This approach is strongly discouraged for implementations."
- **Source**: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/ [文档] T1
- **Scope/Version**: v1.5

### Evidence E15 — 迁移推荐策略：逐步迁移、side-by-side 运行、先非生产验证

- **Claim**: Datadog 和多家来源推荐逐步迁移策略：先安装 Gateway API 控制器与 Ingress-NGINX 共存，捕获性能基线，逐步转换流量，最后做流量切换。GKE 官方指南也推荐先让两个 API 并行运行。
- **Quote**: "The Ingress API and NGINX controller can coexist with your Gateway API implementation throughout the migration."
  "To minimize downtime and mitigate risk, the most effective approach to migrate to Gateway API is to run both your existing Ingress API and the new Gateway API configuration in parallel."
- **Source**: https://www.datadoghq.com/blog/migrate-to-gateway-api/ [文档] T2 + https://docs.cloud.google.com/kubernetes-engine/docs/how-to/migrate-ingress-gateway [文档] T1
- **Scope/Version**: 2026

### Evidence E16 — 1024+ 条 annotations 迁移覆盖不完

- **Claim**: ing-switch 项目映射了 119+ Ingress-NGINX annotations 并给出 impact ratings。Ingress2Gateway 支持 30+ annotations。仍有大量 production 环境使用的 annotations 无法自动迁移。
- **Quote**: "ing-switch maps 119 annotations with impact ratings" 和 "Ingress2Gateway only supported three Ingress-NGINX annotations. For the 1.0 release, Ingress2Gateway supports over 30 common annotations."
- **Source**: https://blog.kubesimplify.com/ing-switch-119-annotations-gateway-api-traefik-impact-ratings [社区] T3 + https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/ [文档] T1
- **Scope/Version**: 2026

### 反证/不足汇总

| 维度 | 状态 | 说明 |
|------|------|------|
| Gateway API 是否太新（成熟度） | ✅ 有反证 | E6, E7, E9 展示显著痛点 |
| 控制器兼容性 | ⚠️ 部分 | 官方 conformant 列表齐全，但 E8 显示真实性能差异极大 |
| 迁移风险 | ✅ 有反证 | E4, E5, E16 展示 annotations 迁移覆盖不完备 |
| 性能对比 | ❌ [不足] | 无直接"Gateway API vs Ingress 性能对比"的同条件下 benchmark |
| 功能覆盖度 | ⚠️ 部分 | 核心路由功能已覆盖，但 E5, E10 展示 extended 特性有差距 |
| 不适合迁移场景 | ❌ [不足] | Q6 搜索结果严重不足（R1 仅 1 条，R3 未找到反证） |

**总体置信度**: Medium — T1 来源丰富（K8s 官方博客、官方文档、istio.io），但反证仅来自 T3 来源（单一个人博客），且 Q6（不适合场景）严重缺乏证据。

---

## P6 Highlights（每个 sub-Q ≤500 token）

### Q1 Highlights — Gateway API 标准成熟度

> **Q1 主问题**: Gateway API 标准成熟度（GA 状态、版本演进、核心 API 稳定性承诺）

- "The Kubernetes SIG Network community presented the General Availability (GA) release of Gateway API (v1.4.0)! Released on October 6, 2025" [Source: https://kubernetes.io/blog/2025/11/06/gateway-api-v1-4/]
- "Gateway API v1.5 brings six widely-requested feature promotions to the Standard channel (Gateway API's GA release channel)" [Source: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/]
- "My takeaway: Gateway API makes hard things possible - but easy things hard." [Source: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/]
- "Ingress is a core component of Kubernetes, the Gateway-API is not shipped with Kubernetes and needs to be installed separately via CRDs." [Source: https://henrikgerdes.me/blog/2026-01-gateway-api-exp-1/]

**置信度**: High — 多个 T1 来源一致确认 GA 状态
**反证覆盖**: ✅ 有反证

### Q2 Highlights — 主流控制器兼容性

> **Q2 主问题**: 主流控制器兼容性（nginx-ingress、Istio、Contour、Traefik、HAProxy 等）

- "Conformant implementations: Agentgateway, Airlock Microgateway, Calico, Cilium, Gloo Gateway, Google Kubernetes Engine, HAProxy Ingress, Istio, kgateway, NGINX Gateway Fabric, Sunbeam Proxy, Traefik Proxy, Varnish Gateway." [Source: https://gateway-api.sigs.k8s.io/docs/implementations/list/]
- "Istio: ✅ No issues were found." [Source: https://github.com/howardjohn/gateway-api-bench/blob/main/README.md]
- "Nginx throughput is 20x worse than the median implementation." [Source: https://github.com/howardjohn/gateway-api-bench/blob/main/README.md]
- "Traefik consolidates all Gateways, even in different namespaces, onto a single shared component." [Source: https://github.com/howardjohn/gateway-api-bench/blob/main/README.md]

**置信度**: High — 官方实现列表完整，独立基准测试提供深入分析
**反证覆盖**: ✅ 有反证（性能差异极大）

### Q3 Highlights — 迁移路径与实践案例

> **Q3 主问题**: 迁移路径与实践案例（工具、社区经验、回滚方案）

- "For the 1.0 release, Ingress2Gateway supports over 30 common annotations (CORS, backend TLS, regex matching, path rewrite, etc.)" [Source: https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/]
- "Unsupported annotation nginx.ingress.kubernetes.io/configuration-snippet" [Source: https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/]
- "The Ingress API and NGINX controller can coexist with your Gateway API implementation throughout the migration." [Source: https://www.datadoghq.com/blog/migrate-to-gateway-api/]
- "ing-switch maps 119 annotations with impact ratings" [Source: https://blog.kubesimplify.com/ing-switch-119-annotations-gateway-api-traefik-impact-ratings]

**置信度**: Medium — 官方迁移工具和支持模式清晰，但大量 annotations 覆盖不完备（仅 30/119+），回滚经验有限
**反证覆盖**: ✅ 有反证

### Q4 Highlights — 性能与运维开销对比

> **Q4 主问题**: 性能与运维开销对比（延迟、资源消耗、运维复杂度）

- "Cilium throughput is unable to scale up with multiple connections, leading to up to 20x worse performance than the median implementation in some cases." [Source: https://github.com/howardjohn/gateway-api-bench/blob/main/README.md]
- "Envoy Gateway: During route updates, there is a temporary downtime for traffic." [Source: https://github.com/howardjohn/gateway-api-bench/blob/main/README.md]
- "Nginx may crash while processing valid HTTPRoutes." [Source: https://github.com/howardjohn/gateway-api-bench/blob/main/README.md]

**置信度**: Medium — 基准测试覆盖多个实现，但缺少"Gateway API vs 原生 Ingress 同控制器"的直接对比
**反证覆盖**: ❌ [未找到反证] — 无直接"Gateway API 比 Ingress 慢"的测试数据

### Q5 Highlights — 功能覆盖度反向映射

> **Q5 主问题**: 功能覆盖度反向映射（Ingress 已有功能能否被 Gateway API 等价实现）

- "Limited features... Reliance on annotations for extensibility... Insufficient permission model." [Source: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/]
- "Extension points do not include annotations on Gateway API resources. This approach is strongly discouraged for implementations." [Source: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/]
- "The real complexity isn't swapping controllers -- it's the annotations. A typical production Ingress has 10-15 NGINX annotations for SSL, auth, rate limiting, CORS, session affinity, and more." [Source: https://blog.kubesimplify.com/ing-switch-119-annotations-gateway-api-traefik-impact-ratings]

**置信度**: Medium — 核心路由功能映射清晰（T1 来源），但 production 级 annotations 迁移覆盖不完备
**反证覆盖**: ✅ 有反证

### Q6 Highlights — 不适合迁移的场景

> **Q6 主问题**: 不适合迁移的场景（保留 Ingress 的理由）

- "If your requirement is simple and getting satisfied with Nginx ingress or any other..." [Source: https://medium.com/google-cloud/kubernetes-ingress-vs-gateway-api-647ee233693d]（此为 T4 未 fetch 的来源，不可靠）
- (无其他可用 verbatim quote)

**置信度**: Low — 搜索结果严重不足。Q6 R1 仅 1 条结果；R3 未找到反证（"为什么保留 Ingress"的正面论述）。**此子问题无法充分回答。**
**反证覆盖**: ❌ [未找到反证]
**不足原因**: 搜索词的限制。DDG 对长 query + 反证语气的匹配不佳；且"WHEN NOT to use X"类 query 通常会被搜索引擎解读为"X 的替代品"而非"X 不适用的场景"。
