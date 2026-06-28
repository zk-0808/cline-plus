# 实验文件归档摘要

> **归档日期**：2026-06-28
> **归档原因**：14 轮 A/B 实验已全部完成，6 个机制升级 active。实验结论已完整沉淀到 SKILL.md（操作层）和 `docs/search/research/`（研究层）。本目录文件为原始实验数据，保留证据链价值，但日常开发不再需要查阅。
>
> **上级文档**：
> - 操作规范 → `skills/search-orchestrator/SKILL.md`（806 行，含全部 6 个 active 机制的最终落地形态）
> - 实验综述 → `docs/search/research/04-experiments.md`（14 轮实验总览表 + 每轮设计/数据/决策）
> - 结果讨论 → `docs/search/research/05-results.md`（active 机制清单 + 失败模式 + 局限性）
> - 决策快查 → `docs/search/search-orchestrator/README.md`（路线项状态表 + 决策文档链接）

---

## 归档文件清单

### Run #1 — P1 Domain Goggles 首轮验证
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-1-goggle.md` | P1 Goggles 4/5 通过，垃圾站清除率 100%；P1.5 FinalScore 联动同期 active | 结论已入 SKILL.md §3.5 + research/04-experiments.md Run #1 |

### Run #2 — P2 Query Rewrite + Fanout 首轮
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-2-fanout.md` | 三路 fanout 首轮 3.6/5，需调参；原始数据未单独存档（记录纪律不足） | 结论已入 research/04-experiments.md Run #2；P2 最终 deferred |

### Run #3 — P2 调参后复测
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-3-fanout-tuned.md` | 调参后 2.6/5 未通过阈值，P2 回炉 | 结论已入 research/04-experiments.md Run #3；P2 最终 deferred |

### Run #4 — P3 Evidence-bound Citation 首轮
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-4-p3-evidence-bound-citation.md` | P3 机制 5/5 通过，但中文 fetch 覆盖率 1/5 暴露基建瓶颈 | 结论已入 SKILL.md §4.3 + research/04-experiments.md Run #4 |

### Run #5 — P3 中文重试
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-5-p3-retry.md` | P3 机制再次 5/5 确认；fetch 基建问题持续 | 结论已入 research/04-experiments.md Run #5 |

### Run #6 — P3 中文第三次验证
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-6-p3-zh-retry.md` | P3 三轮一致 5/5 确认 active；中文 fetch 1/10 确认为基建层问题 | 结论已入 research/04-experiments.md Run #6 |

### Run #7 — P4 Evidence Deduplication
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-7-p4-dedup.md` | P4 同源去重 4/5 通过，Merge Precision 100% | 结论已入 SKILL.md §1.4.5 + research/04-experiments.md Run #7 |

### Run #8a — MCP 后端切换验证
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-8a-mcp-backend.md` | TLS 指纹假设证伪，Node.js → Python curl_cffi 无显著差异，决策 rolled-back | 结论已入 research/04-experiments.md Run #8a；证伪路径无需保留原始数据 |

### Run #9 — P5 Output Schema v1
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-9-p5-output-schema.md` | P5 字段对齐 schema 首轮验证 | 结论已入 research/04-experiments.md Run #9；v1 被 v2/v3 迭代覆盖 |

### Run #9b — P5 Output Schema v2 + 外部评审
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-9b-p5-output-schema-v2.md` | P5 v2 多实体对比验证 | v2 被 v3 迭代覆盖，最终 P5 schema 路径证伪 |
| `run-9b-external-review.md` | 外部评审材料，3/5 有条件 active | 评审过程文档，结论已被后续实验覆盖 |
| `run-9b-phase0-evidence.md` | v2 实验的 Phase 0 证据池 | 证据池数据，仅供实验复现 |

### Run #9c — P5 Output Schema v3（最终轮）
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-9c-p5-output-schema-v3.md` | P5 schema 路径 2/5 证伪，自由文本合成已近天花板 | 结论已入 research/04-experiments.md Run #9c + 05-results.md |
| `run-9c-ground-truth-sealed.md` | 密封 ground truth | 实验密封材料，仅供复现 |
| `run-9c-run-a-output.md` | Run A 基线输出 | 原始实验输出 |
| `run-9c-run-b-output.md` | Run B treatment 输出 | 原始实验输出 |

### Run #10 — P6 Highlights / Relevance Compression
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-10-output.md` | P6 实验完整输出 | 结论已入 SKILL.md Phase 1.bis + research/04-experiments.md Run #10 |
| `run-10-p6-highlights.md` | P6 机制 4/5 通过，Extractive Fidelity 92.3% | 结论已入 research/05-results.md |
| `run-10-phase0-evidence.md` | Phase 0 证据池 | 证据池数据，仅供实验复现 |

### Run #11 — P4 Semantic Merge 扩展验证
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-11-output.md` | P4 语义合并扩展实验输出 | 结论已入 research/04-experiments.md Run #11 |
| `run-11-p4-semantic-merge.md` | P4 语义合并详细分析 | P4 子类验证，结论已入 SKILL.md §1.4.5 Step 3.bis |
| `run-11-baseline-output.md` | 基线输出 | 原始实验输出 |
| `run-11-ground-truth.md` | Ground truth | 实验密封材料 |
| `run-11-baseline.py` | 基线脚本 | 实验辅助代码 |

### Run #12 — P4 Summary Rewrite 验证
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-12-output.md` | P4 摘要重写实验输出 | 结论已入 research/04-experiments.md Run #12 |
| `run-12-p4-summary-rewrite.md` | P4 摘要重写详细分析 | P4 子类验证，结论已入 SKILL.md |

### Run #12b — P4 合并验证（扩展）
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-12b-output.md` | P4 扩展合并验证输出（1133 行，最大实验文件） | 结论已入 research/04-experiments.md Run #12b |
| `run-12b-baseline-output.md` | 基线输出 | 原始实验输出 |
| `run-12b-ground-truth.md` | Ground truth | 实验密封材料 |
| `run-12b-baseline.py` | 基线脚本 | 实验辅助代码 |

### Run #13 — P5 Evidence Map / Claim Graph
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-13-p5-evidence-map.md` | Evidence Map 2/5 证伪，自由文本与结构化中间表示无决定性差异 | 结论已入 research/04-experiments.md Run #13 + 05-results.md |
| `run-13-phase0-evidence.md` | Phase 0 证据池（378 行） | 证据池数据，仅供实验复现 |
| `run-13-ground-truth-sealed.md` | 密封 ground truth | 实验密封材料 |
| `run-13-run-a-output.md` | Run A 基线输出 | 原始实验输出 |
| `run-13-run-b-output.md` | Run B treatment 输出 | 原始实验输出 |

### Run #14 — P5 Gap Ledger 最小机制
| 文件 | 核心结论 | 归档原因 |
|------|---------|---------|
| `run-14-p5-gap-ledger.md` | Gap Ledger 4/5 通过，Gap Recall Δ=+55.6%，升级 active | 结论已入 SKILL.md §4.1 + research/04-experiments.md Run #14 |
| `run-14-phase0-evidence.md` | Phase 0 证据池（553 行） | 证据池数据，仅供实验复现 |
| `run-14-ground-truth-sealed.md` | 密封 ground truth | 实验密封材料 |
| `run-14-run-a-output.md` | Run A 基线输出 | 原始实验输出 |
| `run-14-run-b-output.md` | Run B treatment 输出 | 原始实验输出 |

---

## 统计

- **总文件数**：42（40 个 .md + 2 个 .py）
- **总行数**：~10,800 行
- **覆盖实验轮次**：Run #1 ~ #14（含 #9b/#9c/#12b 等子轮次）
- **active 机制来源**：Run #1(P1/P1.5), #4-6(P3), #7/#11/#12b(P4), #14(P5 Gap Ledger), #10(P6)
- **证伪路径**：Run #2/#3(P2 fanout), #8a(MCP TLS), #9/#9b/#9c(P5 schema), #13(P5 Evidence Map)
