# 归档摘要 — 搜索实验 run-1 到 run-8

> 生成日期：2026-06-28
> 目的：评估早期实验文件是否已被 SKILL.md / survey.md 覆盖，仅供归档参考，不移动或删除原文件。

| 文件 | 核心结论 | 评分 | 已被覆盖？ | 建议 |
|------|----------|------|-----------|------|
| run-1-goggle.md | P1 Goggle 首轮验证，goggle 对搜索质量有正向提升 | 4/5 ✅ | ✅ survey §10 有记录 | 保留，历史基线 |
| run-2-fanout.md | P2 三路 fanout 首轮，原始数据未单独存档（记录纪律问题） | 3.6/5 ⚠️ | ✅ survey §10.5 有横向对照 | 保留，注意数据缺失说明 |
| run-3-fanout-tuned.md | P2 调参复测（DiversityPenalty + R1 保底），综合 2.6/5 倒退，已回退 | 2.6/5 ❌ | ✅ SKILL.md §3.5.6 明确标注回退 + 决策文档引用 | 保留，作为"此路不通"证据 |
| run-4-p3-evidence-bound-citation.md | P3 Claim/Quote/URL 三元组机制可行（5/5），但中文 fetch 仅 1/5 成功，基础设施瓶颈 | 机制 5/5 / 基建 1/5 | ✅ survey 有记录 | 保留，fetch 瓶颈关键证据 |
| run-5-p3-retry.md | P3 英文 query 复测，机制 + 基础设施双维度通过 | 5/5 ✅ | ✅ survey 有记录 | 保留，P3 验证通过的正式证据 |
| run-6-p3-zh-retry.md | P3 中文 query 复测，机制零误引用确认，但 fetch 层为中文站点稳定瓶颈 | 机制 5/5 / 基建 1/5 | ✅ survey 有记录 | 保留，中文 fetch 瓶颈再次确认 |
| run-7-p4-dedup.md | P4 同源内容合并首轮，Merge Precision 100%, False Merge 0, Info Loss 0 | ✅ 通过 | ✅ survey + 指标修订决策文档有记录 | 保留，P4 验证证据 |
| run-8a-mcp-backend.md | MCP 后端切换（Node.js → Python curl_cffi），TLS 指纹假设 disproven，双轮 0/10，已回滚 | 1/5 ❌ | ✅ survey 明确记录回滚 + 决策文档引用 | 保留，"此路不通"关键证据 |

## 总结

- **8 个文件全部已被 survey.md 覆盖**（survey 第 302-309 行有完整索引表）
- **SKILL.md 引用了 run-3 的回退教训**（§3.5.6），其余 run 的结论已沉淀到 SKILL 的机制设计中
- **建议**：所有文件保留不删。run-1 为基线、run-3/run-8a 为"此路不通"反面证据、run-4~6 为 fetch 瓶颈系列证据链、run-7 为 P4 正面证据。均有独立参考价值。
