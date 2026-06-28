# Run #13 — Ground Truth Sealed

> 仅评分阶段由 TRAE agent 解封。Run A / Run B 执行前不要展示给 Cline。
>
> Evidence source: [run-13-phase0-evidence.md](run-13-phase0-evidence.md)
>
> Query: Kubernetes Gateway API 是否值得从 Ingress 迁移：成熟度、控制器兼容性、迁移风险与适用场景

---

## 1. 评分口径

本 GT 不测试字段对齐。评分只看回答是否显式识别 evidence pool 中的 material relations：conflict、tradeoff、temporal_shift、scope_constraint、gap。

### 1.1 命中规则

| 规则 | 说明 |
|------|------|
| 可接受转述 | 不要求逐字复述 GT，但必须表达同一关系 |
| 必须显式 | 只在事实段落隐含出现不算；必须写成冲突、取舍、条件限制、版本变化或证据不足 |
| 必须可追溯 | Run A 至少回指 evidence id；Run B 至少回指 node / edge / evidence id |
| 不奖励字段覆盖 | 单纯列出 GA、控制器、工具、注解数量不算 relation 命中 |
| 惩罚无证据关系 | 若凭常识添加 evidence pool 外关系，计入 Unsupported Relation |

### 1.2 Final Answer 计入口径

`must_be_in_final_answer=true` 的 GT 项必须进入最终答案或最终建议段，单独出现在中间表但没有影响最终回答时只算半命中。

---

## 2. GT Material Relations

| gt_id | type | involved_evidence | expected_statement | must_be_in_final_answer |
|-------|------|-------------------|--------------------|-------------------------|
| GT1 | temporal_shift | E1, E2 | Gateway API 已不是早期实验：v1.4 GA 后，v1.5 又把六项能力升入 Standard，说明标准成熟度在 2025-2026 间继续提升。 | true |
| GT2 | tradeoff | E1, E2, E6, E9 | 标准成熟不等于迁移简单：GA / Standard 能力增加，但 Gateway API 仍需要额外 CRDs、控制器选择，并可能让简单场景更复杂。 | true |
| GT3 | conflict | E3, E8 | 官方 conformance 列表显示多控制器已 conformant，但独立 benchmark 暴露实现质量差异巨大；conformant 不等于生产表现一致。 | true |
| GT4 | scope_constraint | E3, E8 | 控制器选择必须按实现逐一评估；不能把 Gateway API 的标准成熟度直接外推到所有控制器。Istio / kgateway 表现较好，Nginx / Traefik / Cilium / Envoy Gateway 等存在不同风险。 | true |
| GT5 | tradeoff | E4, E5, E16 | 迁移工具降低工作量但不能保证全自动迁移：Ingress2Gateway 支持 30+ annotation，ing-switch 可映射 119+，但仍有 configuration-snippet、proxy-body-size 等无法直接转换或需人工处理。 | true |
| GT6 | scope_constraint | E4, E5, E16 | 只有常见 annotation、标准路由/TLS/CORS/path rewrite 等场景更适合自动迁移；高度依赖 NGINX annotation、snippet、自定义 body/buffer 等生产 Ingress 需要人工审计。 | true |
| GT7 | tradeoff | E11, E14, E10 | Gateway API 解决 Ingress 的 annotation 扩展和权限模型不足，但 extension 不再走 annotation，extended / implementation-specific 能力不统一，部分高级能力会转向厂商 CRD，带来可移植性折扣。 | true |
| GT8 | conflict | E11, E10 | Gateway API 的目标是更可移植和 vendor-agnostic，但现实中 auth / mTLS 等核心未完全覆盖时，各实现通过自有 CRD 补齐能力，可能重新引入 vendor lock-in。 | true |
| GT9 | gap | E8, 反证不足汇总 Q4 | 证据集中没有同一控制器下 Gateway API vs Ingress 的直接性能对比；只能得出实现间性能差异大，不能直接断言 Gateway API 普遍比 Ingress 更慢或更快。 | true |
| GT10 | scope_constraint | E8 | 性能/稳定性判断应限定到具体控制器与规模；Nginx 吞吐、Cilium 配置大小、Envoy Gateway route update、Traefik namespace 隔离问题不能泛化为所有实现。 | true |
| GT11 | tradeoff | E12, E15 | Ingress-NGINX EOL / CVE 风险增强迁移动机，但迁移仍应 side-by-side、先建基线、逐步切流，而不是一次性替换。 | true |
| GT12 | gap | Q6 highlights, 反证不足汇总 Q6 | “哪些场景不适合迁移/保留 Ingress”证据不足；只能低置信推断简单场景可能不值得迁移，不能把它当强结论。 | true |
| GT13 | scope_constraint | E6, E7, E9, E13 | 对简单单域名/少量路由/依赖现成 Helm chart 的场景，Gateway API 可能因 CRD、证书/DNS 死锁、chart 支持不足而增加操作复杂度。 | true |
| GT14 | temporal_shift | E12, E15 | 2026 年 Ingress-NGINX 退役改变迁移优先级：即使原先 Ingress 足够简单，依赖 ingress-nginx 的集群也需要安全生命周期层面的替代计划。 | true |
| GT15 | gap | E7, E15 | 证据有 side-by-side 迁移建议，但没有充分的失败回滚案例；回答应把回滚/失败经验标为证据不足，而非声称已有成熟回滚模式。 | false |
| GT16 | conflict | E4, E5 | Ingress2Gateway 官方宣传 1.0 支持大量常见注解并有等价测试，但同一来源也展示无法配置或无法直接转换的注解；工具能力和工具边界必须同时呈现。 | true |

---

## 3. 评分指标映射

### 3.1 Material Relation Recall

分母：16 个 GT 项。

其中主关系类型：

| type | GT |
|------|----|
| conflict | GT3, GT8, GT16 |
| tradeoff | GT2, GT5, GT7, GT11 |
| temporal_shift | GT1, GT14 |
| scope_constraint | GT4, GT6, GT10, GT13 |
| gap | GT9, GT12, GT15 |

### 3.2 Cross-Dimension Relation Recall

分母：12 个跨维度关系。

| gt_id | 跨维度说明 |
|-------|------------|
| GT2 | 成熟度 × 运维复杂度 |
| GT3 | conformance × 性能/稳定性 |
| GT4 | 控制器兼容性 × 生产风险 |
| GT5 | 迁移工具 × annotation 覆盖边界 |
| GT6 | 自动化迁移 × 生产配置复杂度 |
| GT7 | Ingress 限制 × Gateway 扩展模型 |
| GT8 | vendor-agnostic 目标 × 厂商 CRD 现实 |
| GT9 | 性能证据 × 结论边界 |
| GT11 | 安全生命周期 × 迁移策略 |
| GT12 | 不适合场景 × 证据不足 |
| GT13 | 简单场景 × CRD/DNS/Helm 复杂度 |
| GT14 | Ingress-NGINX EOL × 保留 Ingress 的风险 |

### 3.3 Gap Detection Recall

分母：3 个 gap：GT9、GT12、GT15。

### 3.4 Traceability Rate

统计最终答案中的关键判断：

- Run A：可回指 evidence id 的关键判断数 / 关键判断总数。
- Run B：可回指 node_id / edge_id / evidence id 的关键判断数 / 关键判断总数。

### 3.5 False Conflict Count

把兼容事实误判为冲突时计数。典型误判：

- 把 “Gateway API GA” 与 “仍需 CRD / 控制器选择复杂” 说成逻辑矛盾，而不是成熟度与运维复杂度的 tradeoff。
- 把 “Ingress2Gateway 支持 30+ annotations” 与 “不支持部分 annotations” 说成来源互相冲突，而不是工具覆盖边界。

### 3.6 Unsupported Relation Count

以下情况计数：

- 声称 Gateway API 普遍比 Ingress 性能更差或更好。
- 声称所有主流控制器都生产可用。
- 声称已有成熟回滚方案被证据充分验证。
- 声称简单场景一定不该迁移，但没有保留证据不足限定。

### 3.7 Information Loss Count

`must_be_in_final_answer=true` 的 GT 项未进入最终答案时计数；半命中按 0.5 计。
