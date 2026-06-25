# Run #11 Ground Truth — 语义同源对标注

## 标注方法

TRAE agent 读取 run-11-output.md §2 fetch 全文（8 个 URL fetch 成功），对全部两两配对（C(8,2) = 28 对）执行分类。

**分类类别**：
- `verbatim`：逐字/近逐字镜像（内容 >90% 重叠）
- `semantic-translation`：跨语言翻译（同一内容不同语言，核心信息相同）
- `semantic-summary`：摘要式转载（长文 + 短文摘要）
- `semantic-rewrite`：改写/洗稿（同一内容不同措辞，核心论点相同）
- `different`：不同内容（不同文章/不同角度）

**数据限制说明**：§2 仅归档"正文摘要"而非"完整正文"（与 Run #10 相同的归档问题）。分类基于摘要 + title + snippet，不影响语义同源性判断，但影响 SimHash 基线的全文 hash 精度（见 Phase 2 说明）。

---

## fetch 成功的 URL 清单

| URL # | URL | Title | 语言 | 类型 |
|-------|-----|-------|------|------|
| 1 | kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/ | Sidecar Containers | EN | 官方概念文档 |
| 2 | cloud.tencent.com/developer/article/2522780 | 深入剖析 Kubernetes 原生 Sidecar 容器 | ZH | 原创分析（作者 Se7en258） |
| 3 | kubernetes.io/zh-cn/docs/concepts/workloads/pods/sidecar-containers/ | 边车容器 | ZH | 官方中文翻译 |
| 4 | kubernetes.io/blog/2023/08/25/native-sidecar-containers/ | Kubernetes v1.28: Introducing native sidecar containers | EN | 官方博客 |
| 5 | kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/ | Adopting Sidecar Containers | EN | 官方 tutorial |
| 6 | cloud.tencent.com/developer/article/2324524 | Kubernetes 1.28：介绍原生 Sidecar 容器 | ZH | 官方博客中文翻译（作者 xcbeyond） |
| 7 | blog.csdn.net/cr7258/article/details/139350433 | 深入剖析 Kubernetes 原生 Sidecar 容器 | ZH | 原创分析（作者 cr7258，与 Se7en258 同一人） |
| 8 | kubernetes.ac.cn/docs/concepts/workloads/pods/sidecar-containers/ | Sidecar 容器 | ZH | 官方中文镜像 |

---

## 配对分类表

| #A | #B | 类别 | 判断依据 |
|----|----|-----|---------|
| 1 | 2 | different | #1 是官方概念文档（EN），#2 是原创深度分析（ZH），主题相同但内容独立 |
| 1 | 3 | **semantic-translation** | #3 是 #1 的官方中文翻译，内容结构完全对应 |
| 1 | 4 | different | #1 是概念文档，#4 是 1.28 发布博客，不同文档类型 |
| 1 | 5 | different | #1 是概念文档，#5 是采用指南 tutorial，不同文档 |
| 1 | 6 | different | #6 翻译自 #4（博客），非 #1（概念文档） |
| 1 | 7 | different | #7 是原创分析，非 #1 的翻译 |
| 1 | 8 | **semantic-translation** | #8 是 #3（中文官方）的镜像，#3 是 #1 的翻译，故 #8 与 #1 为跨语言同源 |
| 2 | 3 | different | #2 是原创分析，#3 是官方翻译，内容独立 |
| 2 | 4 | different | #2 是原创分析（ZH），#4 是官方博客（EN），内容独立 |
| 2 | 5 | different | #2 是原创分析，#5 是官方 tutorial，内容独立 |
| 2 | 6 | different | #2 是原创分析，#6 是官方博客翻译，内容独立 |
| 2 | 7 | **verbatim** | 同一作者（Se7en258 = cr7258）跨平台发布的同一篇文章，内容实质相同 |
| 2 | 8 | different | #2 是原创分析，#8 是官方镜像，内容独立 |
| 3 | 4 | different | #3 翻译自 #1 概念文档，#4 是独立博客 |
| 3 | 5 | different | #3 是概念文档翻译，#5 是 tutorial，不同文档 |
| 3 | 6 | different | #3 翻译自概念文档，#6 翻译自博客，不同源 |
| 3 | 7 | different | #3 是官方翻译，#7 是原创分析 |
| 3 | 8 | **verbatim** | #8 是 #3 的镜像站，内容完全一致 |
| 4 | 5 | different | #4 是发布博客，#5 是 tutorial，不同文档 |
| 4 | 6 | **semantic-translation** | #6 是 #4 的中文翻译（作者 xcbeyond 明确标注翻译来源） |
| 4 | 7 | different | #4 是官方博客，#7 是原创分析 |
| 4 | 8 | different | #4 是英文博客，#8 是中文概念文档镜像，不同源 |
| 5 | 6 | different | #5 是 tutorial，#6 是博客翻译，不同文档 |
| 5 | 7 | different | #5 是 tutorial，#7 是原创分析 |
| 5 | 8 | different | #5 是 tutorial，#8 是概念文档镜像 |
| 6 | 7 | different | #6 是官方博客翻译，#7 是原创分析 |
| 6 | 8 | different | #6 是博客翻译，#8 是概念文档镜像 |
| 7 | 8 | different | #7 是原创分析，#8 是官方镜像 |

---

## 统计

| 类别 | 对数 |
|------|------|
| verbatim | 2（对 2-7, 3-8） |
| semantic-translation | 3（对 1-3, 1-8, 4-6） |
| semantic-summary | 0 |
| semantic-rewrite | 0 |
| different | 23 |
| **语义同源合计**（translation + summary + rewrite） | **3** |
| **verbatim 合计** | **2** |
| **总配对数** | **28** |

---

## P4 LLM 合并决策对照

P4 LLM（run-11-output.md §3）识别的合并组：

| 合并组 | P4 标注类型 | Ground Truth 类型 | 最终合并集 | 正确？ |
|--------|------------|------------------|-----------|--------|
| G1: #3→#1 | translation | translation（1-3） | {1, 3} | ✅ 类型 + 合并正确 |
| G2: #6→#4 | translation | translation（4-6） | {4, 6} | ✅ 类型 + 合并正确 |
| G3: #7→#2 | rewrite | **verbatim**（2-7） | {2, 7} | ⚠️ 类型标注错误（rewrite vs verbatim），但合并决策正确 |
| G4: #8→#3 | verbatim | verbatim（3-8） | {8, 3} | ✅ 类型 + 合并正确 |

**传递性合并**：G4（8→3）+ G1（3→1）→ URL-8 最终合并到 URL-1。Ground truth 对 1-8 为 translation，P4 LLM 通过两步合并间接处理。最终合并组 {1, 3, 8} 覆盖了 1-3、1-8、3-8 三个同源对。

**最终合并组 vs Ground Truth 同源对**：

| Ground Truth 同源对 | 是否在同一合并组 | 备注 |
|--------------------|----------------|------|
| 1-3 (translation) | ✅ 组 {1,3,8} | G1 直接处理 |
| 1-8 (translation) | ✅ 组 {1,3,8} | G4+G1 传递处理 |
| 4-6 (translation) | ✅ 组 {4,6} | G2 直接处理 |
| 2-7 (verbatim) | ✅ 组 {2,7} | G3 直接处理 |
| 3-8 (verbatim) | ✅ 组 {1,3,8} | G4 直接处理 |

**所有 5 个同源对（3 translation + 2 verbatim）均被 P4 LLM 正确合并到同一组。**

---

## 样本量限制说明

- 语义同源对仅 3 对（全部为 translation），无 summary/rewrite 子类样本
- verbatim 对 2 对
- 样本量偏小，统计显著性有限，结果仅作方向性参考
- 若需更强统计效力，需扩大 fetch 成功率（解决掘金 JS Challenge）或换用中文社区更密集的主题
