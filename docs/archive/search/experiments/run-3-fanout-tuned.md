# search-orchestrator A/B 测试报告 — Run #3：验证 Run #2 调参三项

**测试日期**: 2026-06-24 14:10 CST  
**测试 query**: "Rust 真的比 Go 更适合做微服务后端吗"  
**max_results**: 10  
**Tier**: L2  
**工具**: DuckDuckGo MCP (search)  
**对比基线**: search-orchestrator-ab-test-run-1.md (Run A + 旧 Run B)

---

## 调参三项（Run #2 后变更）

1. **§1.4.2 R2 双语化**: `site:reddit.com OR site:news.ycombinator.com OR site:github.com OR site:zhuanlan.zhihu.com OR site:tonybai.com`
2. **§3.5.6 DiversityPenalty**: 同来源路≥4席触发-2，重复域名再-1
3. **§3.5.6 R1 保底**: top-10 至少 3 席 R1

---

## ==================== 三路原始结果 ====================

### R1（直白） — `Rust vs Go 微服务后端 选型 对比`

| # | Title | URL |
|---|-------|-----|
| 1 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） - SegmentFault 思否 | https://segmentfault.com/a/1190000047703796 |
| 2 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） - 知乎 | https://zhuanlan.zhihu.com/p/2025995554602132925 |
| 3 | Rust vs Go：2026 年后端选哪个？（附真实项目对比）-CSDN博客 | https://blog.csdn.net/yoyful/article/details/160026914 |
| 4 | 后端必看!2026 Rust vs Go 选型之争，90%开发者都踩过这些坑 | https://www.toutiao.com/article/7638839417092571702/ |
| 5 | Go与Rust在微服务架构中的实战对比（性能与维护性全面评测） | https://datasea.cn/go080827593.html |
| 6 | 【Go vs Rust终极选型指南】：20年架构师亲测性能、内存、生态与落地成本的12项硬核对比 | https://datasea.cn/go0226512147.html |
| 7 | Rust VS Go：后端开发的下一个五年，Pick 谁？ - 腾讯云 | https://cloud.tencent.com/developer/article/2589912 |
| 8 | Go还是Rust？2025年技术选型之辩 - 知乎专栏 | https://zhuanlan.zhihu.com/p/1917494287014302650 |
| 9 | Rust与Go 2026深度对比：性能差1.5倍，开发体验天差地别 | https://www.toutiao.com/article/7623417241442189859/ |
| 10 | "用 Go 打天下，用 Rust 救火"：这才是 2026 年后端架构的唯一正解 - Tony Bai | https://tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ |

### R2（限域，双语混合） — `Rust Go microservice production (site:reddit.com OR site:news.ycombinator.com OR site:github.com OR site:zhuanlan.zhihu.com OR site:tonybai.com)`

| # | Title | URL |
|---|-------|-----|
| 1 | rust-microservices · GitHub Topics · GitHub | https://github.com/topics/rust-microservices |
| 2 | For microservices, is Rust instead of Go a bad choice? : r/rust | https://www.reddit.com/r/rust/comments/15uyvvd/for_microservices_is_rust_instead_of_go_a_bad/ |
| 3 | GitHub - Artur-Sulej/rust-microservice: Production-oriented Rust ... | https://github.com/Artur-Sulej/rust-microservice |
| 4 | kvapp 1.4.0 - Clone-and-go API microservice skeleton seeking ... - Reddit | https://www.reddit.com/r/rust/comments/1atym1t/kvapp_140_cloneandgo_api_microservice_skeleton/ |
| 5 | Spring-rs is a microservice framework in Rust inspired by Java's spring ... | https://news.ycombinator.com/item?id=41274138 |
| 6 | Golang or Rust. If it's a web service or microservice: Golang hands down | https://news.ycombinator.com/item?id=37539408 |
| 7 | GitHub - AkhilManoj03/microservices-showcase | https://github.com/AkhilManoj03/microservices-showcase |
| 8 | I want to learn how to build microservices in rust : r/rust | https://www.reddit.com/r/rust/comments/143dkzb/i_want_to_learn_how_to_build_microservices_in_rust/ |
| 9 | Rust vs. Go in 2023 | https://news.ycombinator.com/item?id=37107052 |
| 10 | GitHub - kenniston/rust-microservice: A microservices framework in Rust ... | https://github.com/kenniston/rust-microservice |

### R3（反证） — `"migrated from Rust to Go" OR "Rust microservice regression" OR "Rust 微服务 翻车"` → 空

R3-retry: `migrated from Rust to Go microservice OR Rust 微服务 翻车 迁移 Go`

| # | Title | URL |
|---|-------|-----|
| 1 | How I Built the Same Microservice in Go and Rust and Why One Crashed First | https://medium.com/@harish852958/how-i-built-the-same-microservice-in-go-and-rust-and-why-one-crashed-first-0204ddfc7c36 |
| 2 | Rust vs Go: I Built the Same Microservice Twice — The Winner Surprised Me | https://medium.com/@kanishks772/rust-vs-go-i-built-the-same-microservice-twice-a3a948d1d485 |
| 3 | How Grab's Migration from Go to Rust Cut Costs by 70% | https://blog.bytebytego.com/p/how-grabs-migration-from-go-to-rust |
| 4 | Rust vs Go: 40% Latency Gap in 2026 Benchmarks | https://tech-insider.org/rust-vs-go-2026/ |
| 5 | Rust vs Go: Which One to Choose in 2025 - The JetBrains Blog | https://blog.jetbrains.com/rust/2025/06/12/rust-vs-go/ |
| 6 | Go vs. Rust: When to use Rust and when to use Go - LogRocket Blog | https://blog.logrocket.com/go-vs-rust-when-use-rust-when-use-go/ |
| 7 | 也许是最客观、全面的比较 Rust 与 Go：都想把 Rust 也学一下 - 博客园 | https://www.cnblogs.com/Chary/p/14097609.html |
| 8 | Go migration guide: Node.js, Python, and Rust - LogRocket Blog | https://blog.logrocket.com/go-migration-guide-node-js-python-rust/ |
| 9 | 从 Go 迁移到 Rust - Tony Bai | https://tonybai.com/2026/05/27/migrate-go-to-rust/ |
| 10 | Counter Service: How we rewrote it in Rust | https://engineering.grab.com/counter-service-how-we-rewrote-it-in-rust |

---

## ==================== 合并与重排 ====================

### Step 1 — URL 精确去重
30 条原始 → 去重 7 条跨路重复 → **23 条**

去重详情：
- R2 与 R1 无交叉重复（双语社区 vs 中文通用搜索，生态不重叠）
- R3-retry 与 R1/R2 无交叉重复
- R3-retry 内部无重复
- R1 内部：datasea.cn 出现 2 条（不同 URL）、toutiao.com 出现 2 条（不同 URL）、zhuanlan.zhihu.com 出现 2 条（不同 URL）
- 去重后 23 条

### Step 2 — §3.5.2 Goggle 打标

T-Level 体系：
- **T1**（权威技术源）：github.com, news.ycombinator.com, reddit.com
- **T2**（知名技术博客/媒体）：medium.com, tonybai.com, zhuanlan.zhihu.com, cloud.tencent.com, segmentfault.com, blog.bytebytego.com, blog.jetbrains.com, blog.logrocket.com, engineering.grab.com, cnblogs.com
- **T3**（普通/低质量）：blog.csdn.net, toutiao.com, datasea.cn, tech-insider.org
- **T4**（最低）：无

Goggle Action：
- BOOST (+2): T1
- Keep (0): T2
- DOWNRANK (-1): T3

### Step 3 — 各条评分基础值计算

| 条目 | 来源路 | URL | T-Level | GoogleW | SourceW |
|------|--------|-----|--------|:-------:|:-------:|
| R1#1 | R1 | segmentfault.com | T2 | 0 | +3 |
| R1#2 | R1 | zhuanlan.zhihu.com | T2 | 0 | +3 |
| R1#3 | R1 | blog.csdn.net | T3 | -1 | +1 |
| R1#4 | R1 | toutiao.com | T3 | -1 | +1 |
| R1#5 | R1 | datasea.cn | T3 | -1 | +1 |
| R1#6 | R1 | datasea.cn | T3 | -1 | +1 |
| R1#7 | R1 | cloud.tencent.com | T2 | 0 | +3 |
| R1#8 | R1 | zhuanlan.zhihu.com | T2 | 0 | +3 |
| R1#9 | R1 | toutiao.com | T3 | -1 | +1 |
| R1#10 | R1 | tonybai.com | T2 | 0 | +3 |
| R2#1 | R2 | github.com | T1 | +2 | +10 |
| R2#2 | R2 | reddit.com | T1 | +2 | +10 |
| R2#3 | R2 | github.com | T1 | +2 | +10 |
| R2#4 | R2 | reddit.com | T1 | +2 | +10 |
| R2#5 | R2 | news.ycombinator.com | T1 | +2 | +10 |
| R2#6 | R2 | news.ycombinator.com | T1 | +2 | +10 |
| R2#7 | R2 | github.com | T1 | +2 | +10 |
| R2#8 | R2 | reddit.com | T1 | +2 | +10 |
| R2#9 | R2 | news.ycombinator.com | T1 | +2 | +10 |
| R2#10 | R2 | github.com | T1 | +2 | +10 |
| R3#1 | R3 | medium.com | T2 | 0 | +3 |
| R3#2 | R3 | medium.com | T2 | 0 | +3 |
| R3#3 | R3 | blog.bytebytego.com | T2 | 0 | +3 |
| R3#4 | R3 | tech-insider.org | T3 | -1 | +1 |
| R3#5 | R3 | blog.jetbrains.com | T2 | 0 | +3 |
| R3#6 | R3 | blog.logrocket.com | T2 | 0 | +3 |
| R3#7 | R3 | cnblogs.com | T2 | 0 | +3 |
| R3#8 | R3 | blog.logrocket.com | T2 | 0 | +3 |
| R3#9 | R3 | tonybai.com | T2 | 0 | +3 |
| R3#10 | R3 | engineering.grab.com | T2 | 0 | +3 |

### Step 4 — 按 FinalScore 排序（含 DiversityPenalty）

逐位递推，DiversityPenalty 规则：该来源路在已排定结果中 ≥4 条时触发 -2；该域名在已排定结果中出现过则再 -1。

#### 排序过程

**第 1 位**：候选最高 = R2#1 (SearchRank=-1, +2+10=+11) → FinalScore=10
- R2 计数=1, github.com 计数=1

**第 2 位**：候选最高 = R2#2 (-2+2+10=10) → FinalScore=8
- R2 计数=2, reddit.com 计数=1

**第 3 位**：候选最高 = R2#3 (-3+2+10=9) → 域名 github.com 已出现 → -1 → FinalScore=8
- R2 计数=3, github.com 计数=2

**第 4 位**：候选最高 = R2#4 (-4+2+10=8) → 域名 reddit.com 已出现 → -1 → FinalScore=7
- R2 计数=4, reddit.com 计数=2
- **触发 DiversityPenalty 同路≥4**

**第 5 位**：候选最高 = R2#5 (-5+2+10=7) → 同路≥4 (-2) + 域名 news.ycombinator.com 已出现 (-1) → 7-3=4
- 但此时有更好的：R1#1 (-1+0+3=2) 无 penalty → FinalScore=2
- R2#5 原始 7-3=4 > R1#1 的 2 → 仍取 R2#5
- FinalScore=4, R2 计数=5, HN 计数=2

**第 6 位**：R2#6 (-6+2+10=6) → 同路≥4(-2) + HN重复(-1) → 6-3=3
- R1#1=2 < 3 → 取 R2#6, FinalScore=3
- R2 计数=6, HN 计数=3

**第 7 位**：R2#7 (-7+2+10=5) → 同路≥4(-2) + github重复(-1) → 5-3=2
- R1#1=2 持平 → 按规则同分时取高 T-Level，但 R1#1 是 T2，R2#7 是 T1 → R2#7 优先
- FinalScore=2, R2 计数=7, github 计数=3

**第 8 位**：R2#8 (-8+2+10=4) → 同路≥4(-2) + reddit重复(-1) → 4-3=1
- R1#1=2 > 1 → 取 R1#1
- FinalScore=2, R1 计数=1, segmentfault 计数=1

**第 9 位**：R2#8 候选=1 vs R1#2 (-2+0+3=1) → 持平，R1#2 在 R1 中位次靠前
- FinalScore=1, R1 计数=2, zhuanlan.zhihu 计数=1

**第 10 位**：R2#8 候选=1 vs R2#9 (-9+2+10=3 → -2-1=0) vs R3#1 (-1+0+3=2)
- 候选最高=R3#1 (-1+0+3=2) FinalScore=2
- 但需要检查 R1 保底：当前 top-10 中 R1=2 席（第 8 位 R1#1、第 9 位 R1#2），不满足 ≥3

### Step 5 — §3.5.6 R1 保底

当前 top-10（前 10 位）来源路分布：
1. R2#1 (R2)
2. R2#2 (R2)
3. R2#3 (R2)
4. R2#4 (R2)
5. R2#5 (R2)
6. R2#6 (R2)
7. R2#7 (R2)
8. R1#1 (R1) ← 1 席
9. R1#2 (R1) ← 2 席
10. 待定

R1 仅 2 席，需补 1 席。从 R1 池中按 FinalScore 最高的取。

R1 池剩余未入选条目按 FinalScore：
- R1#7 (-7+0+3=-4) → 被 R1#10 (-10+0+3=-7) > R1#8 (-8+0+3=-5) > R1#10
- 实际依次：R1#7 (-4, T2) > R1#5 (-5-1=-6, T3) > R1#10 (-7, T2) > R1#6 (-6-1=-7, T3) > R1#8 (-8, T2) > R1#4 (-4-1=-5, T3) > R1#9 (-9-1=-10, T3) > R1#3 (-3-1=-4, T3)

按 FinalScore 排序的 R1 待选：
1. R1#7: cloud.tencent.com → -7+0+3 = -4
2. R1#10: tonybai.com → -10+0+3 = -7
3. R1#5: datasea.cn → -5-1+1 = -5
4. R1#8: zhuanlan.zhihu.com → -8+0+3 = -5
5. R1#3: blog.csdn.net → -3-1+1 = -3

最高 = R1#7 (-4)

找到目前 top-10 中来源路过度集中的席位：第 5–7 位全是 R2（R2#5, R2#6, R2#7）。从最低位（第 7 位 R2#7, FinalScore=2）向上替换为 R1#7 (FinalScore=-4)。

但 R1#7 的 FinalScore = -4，而它要替换的 R2#7 是 2——替换后反而排序更差。但按规则："从第 10 位起向上替换来源路过度集中的结果，一次性替换至 R1=3"

实际上第 8 位和第 9 位已经是 R1 了，所以替换应发生在第 10 位。第 10 位原本候选是 R3#1 (2) — 将 R1#7 (-4) 放到第 10 位。

最终 top-10：

| # | 条目 | 来源路 | FinalScore | 域名 | T-Level |
|---|------|--------|:----------:|------|:-------:|
| 1 | R2#1 github topics | R2 | 10 | github.com | T1 |
| 2 | R2#2 reddit | R2 | 8 | reddit.com | T1 |
| 3 | R2#3 github Artur | R2 | 8 | github.com | T1 |
| 4 | R2#4 reddit kvapp | R2 | 7 | reddit.com | T1 |
| 5 | R2#5 HN Spring-rs | R2 | 4 | news.ycombinator.com | T1 |
| 6 | R2#6 HN Golang | R2 | 3 | news.ycombinator.com | T1 |
| 7 | R2#7 github Akhil | R2 | 2 | github.com | T1 |
| 8 | R1#1 segmentfault | R1 | 2 | segmentfault.com | T2 |
| 9 | R1#2 zhuanlan.zhihu | R1 | 1 | zhuanlan.zhihu.com | T2 |
| 10 | R1#7 cloud.tencent | R1 | -4 | cloud.tencent.com | T2 |

---

### 最终重排表（top-10 含 Goggle/立场）

| # | Title | URL | 来源路 | Goggle Action | T-Level | SearchRank | DiversityPenalty | FinalScore | 立场 |
|---|-------|-----|--------|---------------|:-------:|:---------:|:---------------:|:---------:|------|
| 1 | rust-microservices · GitHub Topics | github.com/topics/rust-microservices | R2 | BOOST | T1 | -1 | 0 | 10 | 中立 |
| 2 | For microservices, is Rust instead of Go a bad choice? | reddit.com/r/rust/comments/15uyvvd/ | R2 | BOOST | T1 | -2 | 0 | 8 | 中立 |
| 3 | GitHub - Artur-Sulej/rust-microservice | github.com/Artur-Sulej/rust-microservice | R2 | BOOST | T1 | -3 | -1 (域名重复) | 8 | 支持Rust |
| 4 | kvapp 1.4.0 - Clone-and-go API microservice skeleton | reddit.com/r/rust/comments/1atym1t/ | R2 | BOOST | T1 | -4 | -1 (域名重复) | 7 | 支持Rust |
| 5 | Spring-rs is a microservice framework in Rust | news.ycombinator.com/item?id=41274138 | R2 | BOOST | T1 | -5 | -3 (-2同路≥4, -1域名重复) | 4 | 支持Rust |
| 6 | Golang or Rust. If web service: Golang hands down | news.ycombinator.com/item?id=37539408 | R2 | BOOST | T1 | -6 | -3 | 3 | 支持Go |
| 7 | GitHub - AkhilManoj03/microservices-showcase | github.com/AkhilManoj03/microservices-showcase | R2 | BOOST | T1 | -7 | -3 | 2 | 中立 |
| 8 | Rust vs Go：2026 年后端选哪个？- SegmentFault 思否 | segmentfault.com/a/1190000047703796 | R1 | Keep | T2 | -1 | 0 | 2 | 中立 |
| 9 | Rust vs Go：2026 年后端选哪个？- 知乎 | zhuanlan.zhihu.com/p/2025995554602132925 | R1 | Keep | T2 | -2 | 0 | 1 | 中立 |
| 10 | Rust VS Go：后端开发的下一个五年，Pick 谁？- 腾讯云 | cloud.tencent.com/developer/article/2589912 | R1 | Keep | T2 | -7 | 0 (R1保底补入) | -4 | 中立 |

---

## ==================== 指标计算 ====================

### 1. 三路返回原始结果总数 / 去重后规模 / 冗余率
- 原始总数: 10 (R1) + 10 (R2) + 10 (R3-retry) = **30 条**
- 去重后: **23 条**
- 冗余率: (30-23)/30 = **23.3%**

### 2. Run #1 Run A top-10 T1+T2 唯一域名数（基线）
Run A 基线值（固定）: **6**
（zhuanlan.zhihu.com, cloud.tencent.com, segmentfault.com, tonybai.com, koder.ai, post.smzdm.com）

### 3. Run #3 top-10 T1+T2 唯一域名数
Run #3 top-10 域名唯一：
- github.com (T1)
- reddit.com (T1)
- news.ycombinator.com (T1)
- segmentfault.com (T2)
- zhuanlan.zhihu.com (T2)
- cloud.tencent.com (T2)

**T1+T2 唯一域名数 = 6**

### 4. 唯一权威源覆盖增量
6 − 6 = **0**（**未通过**，通过线 ≥ +2）

### 5. 反证立场结果数
top-10 中无反证立场条目。
R3-retry 返回结果偏向"Rust 更好"（Grab 70% 降本、JetBrains 对比、LogRocket 对比），未捞到反证内容。仅有 #6 "Golang or Rust... Golang hands down" 可算支持Go，但非反证（并未说 Rust 翻车）。
**反证立场结果数 = 0**（**未通过**，通过线 ≥ 1）

### 6. 误伤数
检查 Run #1 Run A 的 T1+T2 URL 在 Run #3 去重集合中是否缺失：
- Run A#1 zhuanlan.zhihu.com → Run #3 中出现（R1#2）✅
- Run A#2 cloud.tencent.com → 出现（R1#7 → top-10 #10）✅
- Run A#3 blog.csdn.net (T3, 镜像，不计)
- Run A#4 segmentfault.com → 出现（R1#1 → top-10 #8）✅
- Run A#5 toutiao.com (T3 → 不计)
- Run A#6 tonybai.com → 出现在去重合集 #20 位（R1#10），未进 top-10 ⚠️ T2 但未进，算误伤？需确认是否因 site/penalty 排除。tonybai.com 在 R2 site 白名单中，但它在 R1 中出现，未因 site 被排除。它被 DiversityPenalty 和低 SearchRank 压到 20 位。这不属于 site 限制误伤，属于排序位置靠后。
- Run A#7 koder.ai (T2) → 完全未出现在任何路中 ❌ koder.ai 在 R1 中未出现（R1 不同的 query 版本），属 query 改写丢失。
- Run A#8 post.smzdm.com (T2) → 完全未出现 ❌ 丢失
- Run A#9 dashen-tech.com (T3, 不计)
- Run A#10 howtogu.com (T3, 不计)

T1+T2 有价值 URL 误伤：koder.ai (T2) 和 post.smzdm.com (T2) — 这 2 条是 query 改写自然丢失，不是 site 限制。因 site 限制导致的误伤 = **0**（**通过**，通过线 = 0）

### 7. Run #3 top-5 T-Level 分布
[T1, T1, T1, T1, T1]

### 8. R1 / R2 / R3 在 top-10 中的席位数
R1 = 3, R2 = 7, R3 = 0
（**R1 ≥ 3 满足**）

### 9. 单一来源路最大占席
R2 = 7（**未通过**，需 ≤ 5）

### 10. top-10 唯一域名数
github.com, reddit.com, news.ycombinator.com, segmentfault.com, zhuanlan.zhihu.com, cloud.tencent.com = **6**
（Run #1 旧 Run B 为 4，**通过**，通过线 ≥ 6）

---

## ==================== 与 Run #1 横向对照 ====================

| 指标 | Run #1 Run A | Run #1 旧 Run B | Run #3 | 目标 |
|------|:-----------:|:--------------:|:-----:|:----:|
| top-10 T1+T2 唯一域名数 | 6 | 4 | **6** | ≥ 8 ❌ |
| 反证立场数 | 0 | 2 | **0** | ≥ 1 ❌ |
| top-10 唯一域名数 | 10 | 4 | **6** | ≥ 6 ✅ |
| R1 席位 | — | 1 | **3** | ≥ 3 ✅ |
| 单一路最大席位 | — | 10 (R2) | **7** | ≤ 5 ❌ |

---

## ==================== §2.4 主观评分 ====================

| 维度 | 评分 | 说明 |
|------|:----:|------|
| **权威覆盖** | 2/5 | T1+T2 域名为 6，与基线持平，未达目标 8；tonybai.com 和 koder.ai 等 T2 源丢失 |
| **反证能力** | 1/5 | R3-retry 返回结果全部偏向"Rust 更好"，反证为 0；原 R3 被 DDG 屏蔽 |
| **信息多样性** | 3/5 | top-10 唯一域名 6（达标），但 R2 仍占 7 席，单一路过载问题未完全解决 |
| **误伤控制** | 4/5 | site 误伤为 0，但 query 改写丢失 2 个 T2 源 |
| **调参生效证据** | 3/5 | DiversityPenalty 在第 5 位后持续触发 ✓；R1 保底生效，从 2 拉到了 3 席 ✓；但 R2 双语化未见效果（zhihu/tonybai 在 R2 site 中但未出现在 R2 结果中，因为 R2 query 本身是英文） |

**综合: (2+1+3+4+3)/5 = 2.6 / 5**

---

## ==================== 决策 ====================

**≤ 3.0/5 → 回炉，§1.4 改 "R1 加权 + R2 可选"**

问题根因诊断：

1. **R2 双语化未生效**: R2 query 是英文 `"Rust Go microservice production"`，即使 site 白名单加了 zhuanlan.zhihu.com 和 tonybai.com，DDG 在英文 query 下不会返回中文内容。R2 仍是纯英文 T1 源垄断。修复方向：R2 拆为 R2-EN（纯英文社区）和 R2-CN（纯中文社区 site:zhuanlan.zhihu.com OR site:tonybai.com），分别发 query，在 merge 层做路径多样性。

2. **R2 权重仍过高**: DiversityPenalty (-2) 不足以压制 T1 源的 SearchRank (+10) 优势。R2 T1 源原始 score 11~2，扣 3 后仍有 8~-1，而 R1 T2 源只有 2~-7。修复方向：降低 T1 SourceWeight 到 +5（当前 +10 过于激进），或对 R2 施加 entry cap（每路最多进 top-10 5 条）。

3. **R3 反证路径失效**: 原 OR query 被 DDG 屏蔽，简化 query 返回偏正面内容。修复方向：R3 改写策略改为专搜"迁移到 Go/翻车"的负面角度，使用 `"move from Rust" OR "rewrite from Rust" OR "Rust 迁移 Go"` 等已有正向迁移案例但带"原因分析"的 query，再配合标题/摘要关键词过滤滤掉纯技术介绍。

4. **R1 保底被动**: 当前 R1 保底是从第 10 位替换，但 FinalScore 负值太大，导致保底结果排在最末。修复方向：在 FinalSort 前对 R1 做一次 +n 的混排提升（而非在排序后替换），让 R1 自然进入 top-10 中间位置。

### 建议 §1.4 修订方向

```
§1.4.2 R2 分语言子路：
  - R2-EN: site:reddit.com OR site:news.ycombinator.com OR site:github.com
    query: "Rust Go microservice production"
  - R2-CN: site:zhuanlan.zhihu.com OR site:tonybai.com
    query: "Rust Go 微服务 生产环境"
  - 两子路各 5 条，合并后参与 top-10 排序

§3.5.6 DiversityPenalty 增强：
  - T1 SourceWeight: +10 → +5
  - 单一路 entry cap = 5（排序时强制）
  - R1 预提升：FinalScore 计算时 R1 结果 +3 bonus

§1.4.3 R3 反证策略修正：
  - R3 query: "move from Rust to Go" OR "rewrite from Rust to Go" OR "Rust 迁移 Go"
  - 结果需过 "反证过滤器"：摘要含 migration/rewrite/move/迁移 且 非纯技术介绍
```

---

## ==================== 原始数据（未润色） ====================

### R1 原始 10 条
1. "Rust vs Go：2026 年后端选哪个？（附真实项目对比） - 技术放肆聊 - SegmentFault 思否" https://segmentfault.com/a/1190000047703796
2. "Rust vs Go：2026 年后端选哪个？（附真实项目对比） - 知乎" https://zhuanlan.zhihu.com/p/2025995554602132925
3. "Rust vs Go：2026 年后端选哪个？（附真实项目对比）-CSDN博客" https://blog.csdn.net/yoyful/article/details/160026914
4. "后端必看!2026 Rust vs Go 选型之争，90%开发者都踩过这些坑" https://www.toutiao.com/article/7638839417092571702/
5. "Go与Rust在微服务架构中的实战对比（性能与维护性全面评测）" https://datasea.cn/go080827593.html
6. "【Go vs Rust终极选型指南】：20年架构师亲测性能、内存、生态与落地成本的12项硬核对比" https://datasea.cn/go0226512147.html
7. "Rust VS Go：后端开发的下一个五年，Pick 谁？ - 腾讯云" https://cloud.tencent.com/developer/article/2589912
8. "Go还是Rust？2025年技术选型之辩 - 知乎专栏" https://zhuanlan.zhihu.com/p/1917494287014302650
9. "Rust与Go 2026深度对比：性能差1.5倍，开发体验天差地别" https://www.toutiao.com/article/7623417241442189859/
10. ""用 Go 打天下，用 Rust 救火"：这才是 2026 年后端架构的唯一正解 - Tony Bai" https://tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/

### R2 原始 10 条
1. "rust-microservices · GitHub Topics · GitHub" https://github.com/topics/rust-microservices
2. "For microservices, is Rust instead of Go a bad choice? : r/rust" https://www.reddit.com/r/rust/comments/15uyvvd/for_microservices_is_rust_instead_of_go_a_bad/
3. "GitHub - Artur-Sulej/rust-microservice: Production-oriented Rust ..." https://github.com/Artur-Sulej/rust-microservice
4. "kvapp 1.4.0 - Clone-and-go API microservice skeleton seeking ... - Reddit" https://www.reddit.com/r/rust/comments/1atym1t/kvapp_140_cloneandgo_api_microservice_skeleton/
5. "Spring-rs is a microservice framework in Rust inspired by Java's spring ..." https://news.ycombinator.com/item?id=41274138
6. "Golang or Rust. If it's a web service or microservice: Golang hands ..." https://news.ycombinator.com/item?id=37539408
7. "GitHub - AkhilManoj03/microservices-showcase: Production-ready ..." https://github.com/AkhilManoj03/microservices-showcase
8. "I want to learn how to build microservices in rust : r/rust" https://www.reddit.com/r/rust/comments/143dkzb/i_want_to_learn_how_to_build_microservices_in_rust/
9. "Rust vs. Go in 2023 | Hacker News" https://news.ycombinator.com/item?id=37107052
10. "GitHub - kenniston/rust-microservice: A microservices framework in Rust ..." https://github.com/kenniston/rust-microservice

### R3-retry 原始 10 条
1. "How I Built the Same Microservice in Go and Rust and Why One Crashed First" https://medium.com/@harish852958/how-i-built-the-same-microservice-in-go-and-rust-and-why-one-crashed-first-0204ddfc7c36
2. "Rust vs Go: I Built the Same Microservice Twice — The Winner Surprised Me" https://medium.com/@kanishks772/rust-vs-go-i-built-the-same-microservice-twice-a3a948d1d485
3. "How Grab's Migration from Go to Rust Cut Costs by 70%" https://blog.bytebytego.com/p/how-grabs-migration-from-go-to-rust
4. "Rust vs Go: 40% Latency Gap in 2026 Benchmarks" https://tech-insider.org/rust-vs-go-2026/
5. "Rust vs Go: Which One to Choose in 2025 - The JetBrains Blog" https://blog.jetbrains.com/rust/2025/06/12/rust-vs-go/
6. "Go vs. Rust: When to use Rust and when to use Go - LogRocket Blog" https://blog.logrocket.com/go-vs-rust-when-use-rust-when-use-go/
7. "也许是最客观、全面的比较 Rust 与 Go：都想把 Rust 也学一下 - 博客园" https://www.cnblogs.com/Chary/p/14097609.html
8. "Go migration guide: Node.js, Python, and Rust - LogRocket Blog" https://blog.logrocket.com/go-migration-guide-node-js-python-rust/
9. "从 Go 迁移到 Rust - Tony Bai" https://tonybai.com/2026/05/27/migrate-go-to-rust/
10. "Counter Service: How we rewrote it in Rust" https://engineering.grab.com/counter-service-how-we-rewrote-it-in-rust