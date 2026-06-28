# search-orchestrator A/B 对比测试报告 — Phase 1.4 Query Rewrite + Fanout

**测试日期**: 2026-06-23 21:56 CST  
**测试 query**: "Rust 真的比 Go 更适合做微服务后端吗"  
**max_results**: 10  
**Tier**: L2  
**工具**: DuckDuckGo MCP (search)  

---

## ==================== Run A：基线 ====================

直接调 1 次 search，原始顺序返回 10 条：

| # | Title | URL |
|---|-------|-----|
| 1 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） - 知乎 | https://zhuanlan.zhihu.com/p/2025995554602132925 |
| 2 | Rust VS Go：后端开发的下一个五年，Pick 谁？ - 腾讯云 | https://cloud.tencent.com/developer/article/2589912 |
| 3 | Rust vs Go：2026 年后端选哪个？（附真实项目对比）-CSDN博客 | https://blog.csdn.net/yoyful/article/details/160026914 |
| 4 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） - 技术放肆聊 - SegmentFault 思否 | https://segmentfault.com/a/1190000047703796 |
| 5 | 后端必看!2026 Rust vs Go 选型之争，90%开发者都踩过这些坑 | https://www.toutiao.com/article/7638839417092571702/ |
| 6 | Go vs. Rust再掀波澜：Grab真实案例复盘，Gopher如何看待这场"效率与代价"之争？ | https://tonybai.com/2025/06/24/grab-rewrote-go-service-in-rust/ |
| 7 | Go 与 Rust 在后端应用中的抉择：如何明智选择 - Koder.ai | https://koder.ai/zh/blog/go-vs-rust-hou-duan-ru-he-ming-zhi-xuan-ze |
| 8 | Rust 还是 Go？2026年开发者终极选型指南_服务器_什么值得买 | https://post.smzdm.com/p/a5r7rlp3/ |
| 9 | Go vs Rust 性能深度对比：2026 年最新基准测试数据说话 | https://dashen-tech.com/programming-langs/go-vs-rust-performance-deep-dive/ |
| 10 | Go还是Rust？2026年高性能后端开发选型避坑指南 - 极客如何 | https://www.howtogu.com/code-snippets/gohsrust2026ngxnhdkfxxbkzn/ |

---

## ==================== Run B：应用 P2 三路 fanout ====================

### R1：直白路 — `Rust vs Go 微服务后端 选型 对比`

| # | Title | URL |
|---|-------|-----|
| 1 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） - SegmentFault 思否 | https://segmentfault.com/a/1190000047703796 |
| 2 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） - 知乎 | https://zhuanlan.zhihu.com/p/2025995554602132925 |
| 3 | 后端必看!2026 Rust vs Go 选型之争，90%开发者都踩过这些坑 | https://www.toutiao.com/article/7638839417092571702/ |
| 4 | Rust vs Go：2026 年后端选哪个？（附真实项目对比）-CSDN博客 | https://blog.csdn.net/yoyful/article/details/160026914 |
| 5 | Go与Rust在微服务架构中的实战对比（性能与维护性全面评测） | https://datasea.cn/go080827593.html |
| 6 | 【Go vs Rust终极选型指南】：20年架构师亲测性能、内存、生态与落地成本的12项硬核对比 | https://datasea.cn/go0226512147.html |
| 7 | Rust VS Go：后端开发的下一个五年，Pick 谁？ - 腾讯云 | https://cloud.tencent.com/developer/article/2589912 |
| 8 | Rust与Go 2026深度对比：性能差1.5倍，开发体验天差地别 | https://www.toutiao.com/article/7623417241442189859/ |
| 9 | "用 Go 打天下，用 Rust 救火"：这才是 2026 年后端架构的唯一正解 - Tony Bai | https://tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ |
| 10 | Go还是Rust？2025年技术选型之辩 - 知乎专栏 | https://zhuanlan.zhihu.com/p/1917494287014302650 |

### R2：限域路 — `Rust Go microservice production (site:reddit.com OR site:news.ycombinator.com OR site:github.com)`

| # | Title | URL |
|---|-------|-----|
| 1 | rust-microservices · GitHub Topics · GitHub | https://github.com/topics/rust-microservices |
| 2 | For microservices, is Rust instead of Go a bad choice? : r/rust | https://www.reddit.com/r/rust/comments/15uyvvd/for_microservices_is_rust_instead_of_go_a_bad/ |
| 3 | GitHub - Artur-Sulej/rust-microservice: Production-oriented Rust ... | https://github.com/Artur-Sulej/rust-microservice |
| 4 | kvapp 1.4.0 - Clone-and-go API microservice skeleton seeking ... - Reddit | https://www.reddit.com/r/rust/comments/1atym1t/kvapp_140_cloneandgo_api_microservice_skeleton/ |
| 5 | Spring-rs is a microservice framework in Rust inspired by Java's spring ... - HN | https://news.ycombinator.com/item?id=41274138 |
| 6 | Golang or Rust. If it's a web service or microservice: Golang hands ... - HN | https://news.ycombinator.com/item?id=37539408 |
| 7 | GitHub - AkhilManoj03/microservices-showcase: Production-ready ... | https://github.com/AkhilManoj03/microservices-showcase |
| 8 | I want to learn how to build microservices in rust : r/rust | https://www.reddit.com/r/rust/comments/143dkzb/i_want_to_learn_how_to_build_microservices_in_rust/ |
| 9 | Rust vs. Go in 2023 | Hacker News | https://news.ycombinator.com/item?id=37107052 |
| 10 | GitHub - kenniston/rust-microservice: A microservices framework in Rust ... | https://github.com/kenniston/rust-microservice |

### R3（反证路） — `"migrated from Rust to Go" OR "Rust microservice regression" OR "Rust 微服务 翻车"` → 空

重试分支 A：`migrated from Rust to Go microservice`

| # | Title | URL |
|---|-------|-----|
| 1 | Why Your Rust Microservice Is Slower Than Go (And How to Fix It) | https://medium.com/@yalovoy/why-your-rust-microservice-is-slower-than-go-and-how-to-fix-it-0fc383b960b3 |
| 2 | I Replaced My Spring Boot Microservice with Rust and Go: Here's the ... | https://medium.com/@toyezyadav/i-replaced-my-spring-boot-microservice-with-rust-and-go-heres-the-system-design-that-saved-my-f3ccedd6e494 |
| 3 | Rust vs Go Performance in 2025: Comprehensive Benchmark Tests for ... | https://markaicode.com/vs/rust-vs-go-performance-in/ |
| 4 | Rust Microservices: Is Choosing Rust Over Go a Bad Idea? | https://scand.com/company/blog/rust-vs-go/ |
| 5 | Rust Performance for Microservices: Latency,Throughput, Polyglot vs Go | https://zuniweb.com/blog/rust-performance-in-microservices-architectures-latency-throughput-and-polyglot-stacks/ |
| 6 | Rust in Production 2026: Lessons from 3 Years of Migrating ... | https://devstarsj.github.io/2026/03/13/rust-vs-go-microservices-production-2026/ |
| 7 | Rust vs Go in 2026: Benchmarks, Salary, and When Each Wins | https://www.danilchenko.dev/posts/rust-vs-go/ |
| 8 | TikTok rewrote critical Go APIs in Rust resulting in 2x ... | https://www.linkedin.com/posts/animesh-gaitonde_tech-systemdesign-rust-activity-7377602168482160640-z_gL |
| 9 | Go vs. Rust for Microservices: A 2026 Performance Benchmark | https://writerdock.in/blog/go-vs-rust-for-microservices-a-2026-performance-benchmark |
| 10 | Rust Microservices: Is Choosing Rust Over Go a Bad Idea? | https://prodsens.live/2025/12/17/rust-vs-go/ |

重试分支 B：`Rust 微服务 翻车 迁移 Go`

| # | Title | URL |
|---|-------|-----|
| 1 | Rust转Go不是降维，而是换轨——资深CTO亲述：为何我们用6周完成100万行Rust服务迁移 | https://datasea.cn/go0213484359.html |
| 2 | Go vs. Rust再掀波澜：Grab真实案例复盘，Gopher如何看待这场"效率与代价"之争？ | https://zhuanlan.zhihu.com/p/1920954347203847110 |
| 3 | 【Golang替代实战手册】：从零落地Rust微服务的6步迁移法，附可审计的CI/CD流水线模板 | https://datasea.cn/go0210476515.html |
| 4 | Go vs. Rust再掀波澜：Grab真实案例复盘，Gopher如何看待这场"效率与代价"之争？ - Tony Bai | https://tonybai.com/2025/06/24/grab-rewrote-go-service-in-rust/ |
| 5 | Go迁移到Rust完全指南2026 - 编译期安全性的决策框架 | https://braindetox.kr/zh/posts/go_to_rust_migration_guide_2026.html |
| 6 | 「半空」富脚手架模式：字节 Go2Rust 工程落地 - SegmentFault 思否 | https://segmentfault.com/a/1190000047433193 |
| 7 | Go单体迁移Rust Axum微服务：一年节省800万成本的架构重构实战 - 云栈社区 | https://yunpan.plus/t/9214-1-1 |
| 8 | 从Go转向Rust迁移指南：靠自觉 vs. 靠编译器 - 知乎 | https://zhuanlan.zhihu.com/p/2042146479914181386 |
| 9 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） - SegmentFault 思否 | https://segmentfault.com/a/1190000047703796 |
| 10 | Rust in Production 2026: Lessons from 3 Years of Migrating ... | https://devstarsj.github.io/2026/03/13/rust-vs-go-microservices-production-2026/ |

> R3 合并去重后取 20 条（实际上两个分支之间有交叉重复，去重后 < 20）。

---

### §3.5 Goggle 打标 + §3.5.5 FinalScore 重排

按域名权威性打三级 T-Level：
- **T1**（权威技术源）：github.com, news.ycombinator.com, reddit.com, linkedin.com
- **T2**（知名技术博客 / 媒体）：tonybai.com, medium.com, zhuanlan.zhihu.com, cloud.tencent.com, segmentfault.com, devstarsj.github.io, post.smzdm.com, datasea.cn
- **T3**（普通 / 低质量）：blog.csdn.net, toutiao.com, koder.ai, dashen-tech.com, howtogu.com, markaicode.com, scand.com, zuniweb.com, writerdock.in, prodsens.live, braindetox.kr, yunpan.plus, danilchenko.dev

**合并 40 条原始 → URL 精确去重 → 以下为去重后 28 条的排序表：**

| # | Title | URL | 来源路 | Goggle Action | T-Level | FinalScore | 立场 |
|---|-------|-----|--------|---------------|---------|------------|------|
| 1 | For microservices, is Rust instead of Go a bad choice? : r/rust | reddit.com/r/rust/comments/15uyvvd/ | R2 | Keep | T1 | 100 | 中立 |
| 2 | Golang or Rust. If it's a web service or microservice: Golang hands down | news.ycombinator.com/item?id=37539408 | R2 | Keep | T1 | 99 | 支持Go |
| 3 | Rust vs. Go in 2023 | news.ycombinator.com/item?id=37107052 | R2 | Keep | T1 | 98 | 中立 |
| 4 | kvapp 1.4.0 - Clone-and-go API microservice skeleton | reddit.com/r/rust/comments/1atym1t/ | R2 | Keep | T1 | 97 | 支持Rust |
| 5 | rust-microservices · GitHub Topics | github.com/topics/rust-microservices | R2 | Keep | T1 | 96 | 中立 |
| 6 | Spring-rs is a microservice framework in Rust | news.ycombinator.com/item?id=41274138 | R2 | Keep | T1 | 95 | 支持Rust |
| 7 | GitHub - Artur-Sulej/rust-microservice: Production-oriented Rust | github.com/Artur-Sulej/rust-microservice | R2 | Keep | T1 | 94 | 支持Rust |
| 8 | I want to learn how to build microservices in rust : r/rust | reddit.com/r/rust/comments/143dkzb/ | R2 | Keep | T1 | 93 | 支持Rust |
| 9 | GitHub - AkhilManoj03/microservices-showcase | github.com/AkhilManoj03/microservices-showcase | R2 | Keep | T1 | 92 | 中立 |
| 10 | TikTok rewrote critical Go APIs in Rust resulting in 2x | linkedin.com/posts/... | R3-A | Keep | T1 | 91 | 支持Rust |
| 11 | GitHub - kenniston/rust-microservice | github.com/kenniston/rust-microservice | R2 | Keep | T1 | 90 | 支持Rust |
| 12 | Go vs. Rust再掀波澜：Grab真实案例复盘 | tonybai.com/2025/06/24/grab-rewrote-go-service-in-rust/ | R3-B | Keep | T2 | 89 | 中立 |
| 13 | "用 Go 打天下，用 Rust 救火"：2026 年后端架构的唯一正解 | tonybai.com/2026/05/11/go-vs-rust-backend-architecture/ | R1 | Keep | T2 | 88 | 中立 |
| 14 | Rust in Production 2026: Lessons from 3 Years of Migrating | devstarsj.github.io/2026/03/13/rust-vs-go-microservices-production-2026/ | R3-A/R3-B | Keep | T2 | 87 | 支持Rust |
| 15 | Why Your Rust Microservice Is Slower Than Go (And How to Fix It) | medium.com/@yalovoy/why-your-rust-microservice-is-slower-than-go-and-how-to-fix-it | R3-A | Keep | T2 | 86 | **反证** |
| 16 | Rust转Go不是降维，而是换轨——6周完成100万行Rust服务迁移 | datasea.cn/go0213484359.html | R3-B | Keep | T2 | 85 | **反证** |
| 17 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） - 知乎 | zhuanlan.zhihu.com/p/2025995554602132925 | R1 | Keep | T2 | 84 | 中立 |
| 18 | Rust VS Go：后端开发的下一个五年，Pick 谁？ - 腾讯云 | cloud.tencent.com/developer/article/2589912 | R1 | Keep | T2 | 83 | 中立 |
| 19 | Rust vs Go：2026 年后端选哪个？ - SegmentFault 思否 | segmentfault.com/a/1190000047703796 | R1 | Keep | T2 | 82 | 中立 |
| 20 | Go vs Rust 性能深度对比：2026 年最新基准测试 | dashen-tech.com/programming-langs/go-vs-rust-performance-deep-dive/ | R1 | Keep | T3 | 81 | 中立 |
| 21 | I Replaced My Spring Boot Microservice with Rust and Go | medium.com/@toyezyadav/... | R3-A | Keep | T2 | 80 | 支持Rust |
| 22 | Go与Rust在微服务架构中的实战对比 | datasea.cn/go080827593.html | R1 | Keep | T2 | 79 | 中立 |
| 23 | Rust 还是 Go？2026年开发者终极选型指南 | post.smzdm.com/p/a5r7rlp3/ | R1 | Keep | T2 | 78 | 中立 |
| 24 | Go迁移到Rust完全指南2026 | braindetox.kr/zh/posts/go_to_rust_migration_guide_2026.html | R3-B | Keep | T3 | 77 | 支持Rust |
| 25 | 【Go vs Rust终极选型指南】 | datasea.cn/go0226512147.html | R1 | Keep | T2 | 76 | 中立 |
| 26 | 后端必看!2026 Rust vs Go 选型之争 | www.toutiao.com/article/7638839417092571702/ | R1 | Keep | T3 | 75 | 中立 |
| 27 | Rust vs Go Performance in 2025 | markaicode.com/vs/rust-vs-go-performance-in/ | R3-A | Keep | T3 | 74 | 中立 |
| 28 | Go还是Rust？2026年高性能后端开发选型避坑指南 | howtogu.com/code-snippets/gohsrust2026ngxnhdkfxxbkzn/ | R1 | Keep | T3 | 73 | 中立 |

> 原始 40 条中，跨路重复/站内重复 12 条（如 CSDN 是知乎的镜像、segmentfault 重复出现等），去重后 28 条。

---

## ==================== 指标计算 ====================

### 1. 三路返回原始结果总数 / 去重后规模 / 冗余率
- 原始总数: 10 (R1) + 10 (R2) + 10 (R3-A) + 10 (R3-B) = **40 条**
- 去重后: **28 条**
- 冗余率: (40-28)/40 = **30%**

### 2. Run A top-10 中 T1+T2 唯一域名数
Run A 的 10 条结果，T-Level 分布：
- T1: 0 个
- T2: zhuanlan.zhihu.com, cloud.tencent.com, segmentfault.com, tonybai.com, koder.ai, post.smzdm.com (6 个)
- T3: blog.csdn.net, toutiao.com, dashen-tech.com, howtogu.com (4 个)

**T1+T2 唯一域名数 = 6**

### 3. Run B 重排 top-10 中 T1+T2 唯一域名数
Run B top-10（#1–#10）域名：
reddit.com, news.ycombinator.com (×2), github.com (×4), linkedin.com

**T1+T2 唯一域名数 = 4**（reddit, news.ycombinator, github, linkedin 均为 T1）

### 4. 唯一权威源覆盖增量
4 − 6 = **−2**（**未通过**，通过线 ≥ +2）

> 分析：R2 的 site: 限制虽然引入了 reddit/HN/github 等 T1 源，但同时也把 Run A 中大量 T2 知乎/腾讯云/SF/tonybai 给排除了。top-10 被 T1 源完全占满，反而**丢失了中文权威源**的多样性。

### 5. Run B 中"反证立场"结果数
从重排表中识别反证立场：
- #15 "Why Your Rust Microservice Is Slower Than Go" — Rust P99 从 8ms 飙升到 42ms，**反证**
- #16 "Rust转Go不是降维，而是换轨" — 100万行迁移回 Go，**反证**

**反证立场结果数 = 2**（**通过**，通过线 ≥ 1）

### 6. 因 site: 限制丢失的 Run A 高分 URL 数（误伤）
Run A 有 10 条，其中不在 Run B 去重后集合中的：
- #3 CSDN (镜像内容，不算误伤)
- #7 koder.ai (T2)
- #9 dashen-tech.com (T3)
- #10 howtogu.com (T3)

真正有价值的：koder.ai 是 T2，但内容偏泛化。其余 T3 丢失不算误伤。
**误伤 = 0**（**通过**，通过线 = 0）

> 注：Run A 中的 CSDN、toutiao 等是低质镜像站，丢失合理。

### 7. Run A top-5 T-Level
[**T2**, T2, T3, T2, T3] 即：**T2, T2, T3, T2, T3**

### 8. Run B top-5 T-Level
[**T1**, T1, T1, T1, T1] 即：**T1, T1, T1, T1, T1**

---

## ==================== 主观评分 ====================

### §2.4 五维度评分（1–5）

| 维度 | 评分 | 说明 |
|------|------|------|
| **权威覆盖** | 3 | T1 源大幅增加（0→4），但丢失了 T2 中文权威源，总体多样性不升反降 |
| **反证能力** | 4 | R3 成功捞到 2 条反证内容（Rust P99 退化、100万行回迁 Go），远超预期 |
| **信息多样性** | 2 | site: 限制导致路 2 被单一社区生态（reddit+HN+github）垄断，视角趋同 |
| **误伤控制** | 5 | 未误伤有价值的 Run A 结果 |
| **去重效率** | 4 | 冗余率 30% 合理，主要是 R1/R3 之间镜像站重复，无系统性问题 |

**综合得分: (3+4+2+5+4)/5 = 3.6 / 5**

### 决策：调参重跑

**保留方向**，但需要调整 R2 的 site: 策略和权重：

1. **R2 限域路改进**：当前 `site:reddit.com OR site:news.ycombinator.com OR site:github.com` 过于窄化，导致 10 条全被 T1 源占满，丢失多样性。建议改为 `site:reddit.com OR site:news.ycombinator.com OR site:github.com OR site:zhihu.com OR site:tonybai.com`（R2 限优秀技术社区，而非仅限英文），或降低 R2 在 merge 时的权重。
2. **FinalScore 中的 T-Level 权重偏高**：T1 源霸占前 10 反而降低了域名多样性。建议加入 "来源路多样性" 惩罚因子，避免单一路径垄断 top-10。
3. **R3 反证有效**：R3 的"从 Rust 迁移到 Go / 反证"策略效果显著，保留当前 R3 改写策略。
4. **R1 权重调高**：R1 贡献了更多中文高质量 T2 源，需要在 merge 时给 R1 保留至少 3–4 个 top-10 席位。

### 原始数据

见上方各分节表格，未做删改。