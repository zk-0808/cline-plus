# Run #7 — P4 Evidence Deduplication 首轮验证

- **测试日期**：2026-06-24
- **测试改造**：Phase 1.4 P4 Evidence Deduplication（URL 精确去重后追加同源内容合并）
- **测试 query**：`"Rust 真的比 Go 更适合做微服务后端吗"`
- **Search MCP**：DuckDuckGo, max_results=10
- **单一 query，无改写或扇出**

---

## P4 改造定义

**当前行为**（SKILL.md §1.4.5 Step 3）：按 URL 精确去重。

**P4 增强**：在 URL 去重之后追加同源内容合并步骤：

```
Step 3         按 URL 精确去重（现有）
Step 3.bis    同源内容合并（P4 新增）
                 ① 对去重后的结果集，两两比较 title 相似度
                 ② 若 title 相似度 > 80%（同一篇文章的镜像/转载），
                    只保留权威分级最高的那个（T1 > T2 > T3 > T4）；
                    若 T-Level 同级，保留 SearchRank 更高的那个
                 ③ 被丢弃的 URL 在 Source 表中标注为 [同源合并]
Step 4         合并集 → Goggle → FinalScore → 充分性评分（不变）
```

**设计护栏**：
- title 相似度判断不使用数值公式，由 LLM 判断"是否同一篇文章的不同转载"
- 转载镜像保留最高权威源（例如保留知乎，丢弃 CSDN/SF）
- 被合并的 URL 不丢弃 trace——在 Source 表标注 `[同源合并：并入 <保留的URL>]`

---

## Phase 1: Search 层原始输出

调用 DuckDuckGo search（max_results=10），单一 query，无改写或扇出。

| # | Title | URL |
|---|-------|-----|
| 1 | Rust VS Go：后端开发的下一个五年，Pick 谁？ | https://cloud.tencent.com/developer/article/2589912 |
| 2 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） | https://zhuanlan.zhihu.com/p/2025995554602132925 |
| 3 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） | https://segmentfault.com/a/1190000047703796 |
| 4 | 后端必看!2026 Rust vs Go 选型之争，90%开发者都踩过这些坑 | https://www.toutiao.com/article/7638839417092571702/ |
| 5 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） | https://blog.csdn.net/yoyful/article/details/160026914 |
| 6 | Go vs Rust：后端开发语言该如何选择？ | https://zhuanlan.zhihu.com/p/2026038857603327226 |
| 7 | "用 Go 打天下，用 Rust 救火"：这才是 2026 年后端架构的唯一正解 | https://tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ |
| 8 | Rust vs Go：现代编程语言深度对比与选择指南 | https://cloud.tencent.com/developer/article/2558260 |
| 9 | Rust 与 Go，后端开发的下一个五年，谁是更稳的选择？ | https://segmentfault.com/a/1190000047405757 |
| 10 | Go 与 Rust 在后端应用中的抉择：如何明智选择 | https://koder.ai/zh/blog/go-vs-rust-hou-duan-ru-he-ming-zhi-xuan-ze |

---

## Phase 2: Evidence 层 — Run A（基线，当前 SKILL.md 流程）

### Step 1: URL 精确去重

10 条结果 URL 全部唯一，去重后总数：**10**

### Step 2: Goggle 打标

应用 Goggle A（general-tech）+ Goggle E（zh-tech），结果：

| # | URL | 域名 | Goggle Action |
|---|-----|------|---------------|
| 1 | cloud.tencent.com/developer/article/2589912 | 腾讯云开发者社区 | — |
| 2 | zhuanlan.zhihu.com/p/2025995554602132925 | 知乎 | ✓ BOOST (zh-tech: zhihu.com 高赞答主) |
| 3 | segmentfault.com/a/1190000047703796 | SegmentFault | — |
| 4 | toutiao.com/article/7638839417092571702/ | 头条 | ✗ DISCARD (zh-tech: toutiao.com) |
| 5 | blog.csdn.net/yoyful/article/details/160026914 | CSDN | ↓ DOWNRANK (zh-tech: csdn.net 个人转载) |
| 6 | zhuanlan.zhihu.com/p/2026038857603327226 | 知乎 | ✓ BOOST (zh-tech: zhihu.com 高赞答主) |
| 7 | tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ | Tony Bai 博客 | —（注：Tony Bai 是 Go 社区知名作者，T2 级但 Goggle 无匹配） |
| 8 | cloud.tencent.com/developer/article/2558260 | 腾讯云开发者社区 | — |
| 9 | segmentfault.com/a/1190000047405757 | SegmentFault | — |
| 10 | koder.ai/zh/blog/go-vs-rust-hou-duan-ru-he-ming-zhi-xuan-ze | Koder.ai | — |

### Step 3: T-Level 评估

| # | URL | T-Level | 理由 |
|---|-----|---------|------|
| 1 | cloud.tencent.com/developer/article/2589912 | **T2**（半权威） | 腾讯云开发者社区，平台级技术博客，质量有审核 |
| 2 | zhuanlan.zhihu.com/p/2025995554602132925 | **T3**（社区） | 知乎个人文章，专业度较高但非权威 |
| 3 | segmentfault.com/a/1190000047703796 | **T3**（社区） | SegmentFault 社区文章 |
| 4 | toutiao.com/article/7638839417092571702/ | **T4**（低权威） | 头条营销号，SEO 农场内容 |
| 5 | blog.csdn.net/yoyful/article/details/160026914 | **T4**（低权威） | CSDN 个人转载，含转载农场特征 |
| 6 | zhuanlan.zhihu.com/p/2026038857603327226 | **T3**（社区） | 知乎个人文章，自称 8 年后端经验 |
| 7 | tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ | **T2**（半权威） | Tony Bai 是 Go 社区知名技术作者，博客质量经社区认可 |
| 8 | cloud.tencent.com/developer/article/2558260 | **T2**（半权威） | 腾讯云开发者社区 |
| 9 | segmentfault.com/a/1190000047405757 | **T3**（社区） | SegmentFault 社区文章 |
| 10 | koder.ai/zh/blog/go-vs-rust-hou-duan-ru-he-ming-zhi-xuan-ze | **T3**（社区） | Koder.ai 技术博客 |

### Step 4: FinalScore 重排

FinalScore = SearchRank（-position）+ GoggleWeight + SourceWeight

| # | 域名 | SearchRank | GoggleWeight | SourceWeight | FinalScore |
|---|------|-----------:|-------------:|-------------:|-----------:|
| 1 | cloud.tencent.com/developer/article/2589912 | -1 | 0 | +3 (T2) | **+2** |
| 2 | zhuanlan.zhihu.com/p/2025995554602132925 | -2 | +2 (BOOST) | +1 (T3) | **+1** |
| 3 | segmentfault.com/a/1190000047703796 | -3 | 0 | +1 (T3) | **-2** |
| 6 | zhuanlan.zhihu.com/p/2026038857603327226 | -6 | +2 (BOOST) | +1 (T3) | **-3** |
| 7 | tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ | -7 | 0 | +3 (T2) | **-4** |
| 8 | cloud.tencent.com/developer/article/2558260 | -8 | 0 | +3 (T2) | **-5** |
| 5 | blog.csdn.net/yoyful/article/details/160026914 | -5 | -1 (DOWNRANK) | +0.1 (T4) | **-5.9** |
| 9 | segmentfault.com/a/1190000047405757 | -9 | 0 | +1 (T3) | **-8** |
| 10 | koder.ai/zh/blog/go-vs-rust-hou-duan-ru-he-ming-zhi-xuan-ze | -10 | 0 | +1 (T3) | **-9** |
| 4 | toutiao.com/article/7638839417092571702/ | -4 | -∞ (DISCARD) | — | **-∞** |

### Top-5（排序后，排除 DISCARD）

| 排序 | 原始 # | 域名 | FinalScore | T-Level | Goggle Action |
|------|--------|------|-----------:|---------|---------------|
| 1 | 1 | cloud.tencent.com/developer/article/2589912 | **+2** | T2 | — |
| 2 | 2 | zhuanlan.zhihu.com/p/2025995554602132925 | **+1** | T3 | ✓ BOOST |
| 3 | 3 | segmentfault.com/a/1190000047703796 | **-2** | T3 | — |
| 4 | 6 | zhuanlan.zhihu.com/p/2026038857603327226 | **-3** | T3 | ✓ BOOST |
| 5 | 7 | tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ | **-4** | T2 | — |

### Run A 结论 + 证据

**结论**：Rust 和 Go 在后端微服务中没有绝对的"更好"，选择取决于项目场景——Rust 适合高并发、低延迟、对性能极端敏感的核心模块（代价是陡峭的学习曲线和较慢的迭代速度），Go 适合快速迭代的业务层和 I/O 密集型服务（代价是极致性能不如 Rust）。

**证据**：

- **腾讯云文章（T2）**: Rust 以编译时严谨换取运行时极致性能，Go 以运行时灵活性提升开发效率，两者在系统编程与云原生领域各展所长。
- **知乎真实经验对比（T3）**: "Rust for high stakes, Go for low costs"——当延迟容忍度极低、安全要求极高时用 Rust，否则 Go 在经济性上胜出。
- **知乎 8 年经验分析（T3）**: Go 和 Rust 语言定位根本不同：Go 天生为写服务而生，Rust 擅长系统级控制，不该简单对立。
- **Tony Bai（T2）**: "用 Go 打天下，用 Rust 救火"——先用 Go 快速验证业务，瓶颈模块再迁移到 Rust。
- **SegmentFault 转载（T3）**: 与知乎文章完全相同的转载内容（来自同一作者，Bitfield Consulting 2026）。

**信心度**：Medium（依赖 T2+T3 社区来源，无 T1 官方文档支撑该选型类问题，此为正常现象——语言选型问题天生缺乏 T1 来源）。

---

## Phase 3: Evidence 层 — Run B（P4 增强规则）

### Step 1: URL 精确去重（同 Run A）

10 条结果，URL 全部唯一。去重后总数：10。

### Step 2: 同源内容合并

**检查结果**：发现 1 组同源转载镜像。

#### 分析过程

对比各结果 title + URL 域名 + 内容摘要：

| 结果对 | Title 对比 | 摘要对比 | 是否同源 |
|--------|-----------|---------|---------|
| #2 vs #3 | 完全相同 | 摘要均以 "Rust for high stakes, Go for low costs." 开头，引用同一作者（Bitfield Consulting, 2026） | ✅ **同源** |
| #2 vs #5 | 完全相同 | 摘要均以 "Rust for high stakes, Go for low costs." 开头，引用同一作者 | ✅ **同源** |
| #3 vs #5 | 完全相同 | 同上 | ✅ **同源** |

#### 同源合并明细表

| 合并组 | 被合并 URL（丢弃） | 保留 URL | 判断依据 |
|--------|-------------------|---------|---------|
| 1 | #3: segmentfault.com/a/1190000047703796（T3） | #2: zhuanlan.zhihu.com/p/2025995554602132925（T3, 原 SearchRank 更高） | 完全相同标题 + 完全相同开头引用 "Rust for high stakes, Go for low costs."，确认为同一篇文章的跨站转载 |
| 1 | #5: blog.csdn.net/yoyful/article/details/160026914（T4） | #2: zhuanlan.zhihu.com/p/2025995554602132925（T3, 权威分级更高） | 同上。CSDN T4 < 知乎 T3，优先保留权威分级更高的知乎版本 |

**注**：#2（知乎）与 #3（SegmentFault）和 #5（CSDN）T-Level 同级或更高。保留 #2 因 SearchRank 更高（-2 vs -3 vs -5）且权威分级高于 CSDN。T3 vs T3 同级 → 保留 SearchRank 更高的 #2。

### Step 3: Goggle 打标 + T-Level + FinalScore（在合并后集上执行）

合并后结果集共 **8** 条（原 10 条 - 合并 2 条），保留的 FinalScore 与 Run A 一致（只移除被合并项）：

| 原始 # | 域名 | SearchRank | GoggleWeight | SourceWeight | FinalScore |
|--------|------|-----------:|-------------:|-------------:|-----------:|
| 1 | cloud.tencent.com/developer/article/2589912 | -1 | 0 | +3 (T2) | **+2** |
| 2 | zhuanlan.zhihu.com/p/2025995554602132925 | -2 | +2 (BOOST) | +1 (T3) | **+1** |
| 6 | zhuanlan.zhihu.com/p/2026038857603327226 | -6 | +2 (BOOST) | +1 (T3) | **-3** |
| 7 | tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ | -7 | 0 | +3 (T2) | **-4** |
| 8 | cloud.tencent.com/developer/article/2558260 | -8 | 0 | +3 (T2) | **-5** |
| 9 | segmentfault.com/a/1190000047405757 | -9 | 0 | +1 (T3) | **-8** |
| 10 | koder.ai/zh/blog/go-vs-rust-hou-duan-ru-he-ming-zhi-xuan-ze | -10 | 0 | +1 (T3) | **-9** |
| 4 | toutiao.com/article/7638839417092571702/ | -4 | -∞ (DISCARD) | — | **-∞** |

### Step 4: Top-5（合并后）

| 排序 | 原始 # | 域名 | FinalScore | T-Level | 备注 |
|------|--------|------|-----------:|---------|------|
| 1 | 1 | cloud.tencent.com/developer/article/2589912 | **+2** | T2 | — |
| 2 | 2 | zhuanlan.zhihu.com/p/2025995554602132925 | **+1** | T3 | 保留（原转载中的最高权威版本） |
| 3 | 6 | zhuanlan.zhihu.com/p/2026038857603327226 | **-3** | T3 | — |
| 4 | 7 | tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ | **-4** | T2 | — |
| 5 | 8 | cloud.tencent.com/developer/article/2558260 | **-5** | T2 | — |

---

## 指标计算

### 基础统计（基于去重后结果集）

| 指标 | 值 |
|------|---:|
| 1. URL 精确去重后的结果总数 | 10 |
| 2. 识别出的同源镜像组数 | 1组（#2/#3/#5 同一篇文章的 3 次发布） |
| 3. 被合并的镜像 URL 总数 | 2（#3 segmentfault.com + #5 blog.csdn.net） |

### 核心指标

| 指标 | 值 |
|------|---:|
| 4. **同源合并率** = 2 / (3-1) = **100%** | 所有转载均被正确识别 |
| 5. Run A 的 Top-5 唯一域名数 | **4**（cloud.tencent.com, zhuanlan.zhihu.com, segmentfault.com, tonybai.com） |
| 6. Run B（合并后）的 Top-5 唯一域名数 | **3**（cloud.tencent.com, zhuanlan.zhihu.com, tonybai.com） |
| 7. **Top-5 域名多样性变化** = 3 - 4 = **-1** | 下降 1 |

**多样性变化分析**：Run A Top-5 中 segmentfault.com（#3）是 #2 知乎文章的转载；合并后 slot 释放，但后续排位的是 #8 腾讯云（与 #1 同域），导致独有域名数下降。这是合并转载的"副作用"——转载站虽占用了 slot，但原转载的内容已被 Top-5 中保留的原版覆盖，所以释放的 slot 被同一域的其他文章填充。域名多样性不增反降，但**内容多样性实际上并未恶化**（SF 转载与知乎原版是同一内容）。

### 误伤检查

| 指标 | 值 |
|------|---:|
| 8. **误合并数** | **0** |
| 9. **信息损失检查** | **无** — #3（SegmentFault）和 #5（CSDN）均与 #2（知乎）为同一篇文章的完整转载，不包含独特 claim。保留的 #2 知乎版本已覆盖全部内容。 |

---

## 主观评分

| 分数 | 条件 | 评估 |
|------|------|------|
| 5/5 | 同源合并率 100% 且 误合并 = 0 且 Top-5 域名多样性提升 ≥ 1 | ❌ 多样性下降 |
| 4/5 | 同源合并率 ≥ 80% 且 误合并 = 0 且 Top-5 域名多样性不变或提升 | ❌ 多样性下降 |
| **3/5** | 同源合并率 ≥ 60% 且 误合并 ≤ 1 | **✅** 命中 |

### 评分：**3/5**

**评分依据**：同源合并率 100% 且误合并为 0，P4 合并规则执行正确，无信息损失。但 Top-5 域名多样性从 4 降至 3（-1），未达到 4/5 所需的"不变或提升"条件。多样性下降的原因是合并的转载（SF）原本提供了唯一域名，但内容与 #2 知乎重复；释放的 slot 被同域（腾讯云另一文章）填充，治标不治本。P4 规则本身是正确的，但在此测试集中因转载文章已是 Top-5 中唯一的那个域名（segmentfault.com），合并后多样性反降——这属于指标设计上的"伪阳性"，而非规则缺陷。

---

## 原始搜索结果（附 URL）

| # | Title | URL | 状态 |
|---|-------|-----|------|
| 1 | Rust VS Go：后端开发的下一个五年，Pick 谁？ | https://cloud.tencent.com/developer/article/2589912 | ✅ Top-1 |
| 2 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） | https://zhuanlan.zhihu.com/p/2025995554602132925 | ✅ 保留（同源合并保留版本） |
| 3 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） | https://segmentfault.com/a/1190000047703796 | 🔗 [同源合并：并入 #2 知乎] |
| 4 | 后端必看!2026 Rust vs Go 选型之争，90%开发者都踩过这些坑 | https://www.toutiao.com/article/7638839417092571702/ | ✗ DISCARD（toutiao.com） |
| 5 | Rust vs Go：2026 年后端选哪个？（附真实项目对比） | https://blog.csdn.net/yoyful/article/details/160026914 | 🔗 [同源合并：并入 #2 知乎] |
| 6 | Go vs Rust：后端开发语言该如何选择？ | https://zhuanlan.zhihu.com/p/2026038857603327226 | ✅ Top-3 |
| 7 | "用 Go 打天下，用 Rust 救火"：这才是 2026 年后端架构的唯一正解 | https://tonybai.com/2026/05/11/go-vs-rust-backend-architecture-the-2026-strategy/ | ✅ Top-4 |
| 8 | Rust vs Go：现代编程语言深度对比与选择指南 | https://cloud.tencent.com/developer/article/2558260 | ✅ Top-5 |
| 9 | Rust 与 Go，后端开发的下一个五年，谁是更稳的选择？ | https://segmentfault.com/a/1190000047405757 | — |
| 10 | Go 与 Rust 在后端应用中的抉择：如何明智选择 | https://koder.ai/zh/blog/go-vs-rust-hou-duan-ru-he-ming-zhi-xuan-ze | — |