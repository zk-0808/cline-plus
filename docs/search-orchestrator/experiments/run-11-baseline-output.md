# Run #11 Baseline — SimHash/Jaccard + URL 规范化

## 算法参数

| 参数 | 值 | 来源 |
|------|---|------|
| SimHash Hamming threshold | 3 | Manku/Google WWW'07 |
| Jaccard threshold | 0.9 | Manning IR Book §19.6 |
| k-shingle | 4 | Manning IR Book 默认值 |
| 输入文本 | title + fetch 摘要 | §2 仅存摘要非完整正文（数据限制） |

## 合并决策表

| #A | #B | GT | URL 规范化 | SimHash 汉明距 | Jaccard | 基线合并 | 正确？ |
|----|----|-----|-----------|---------------|---------|---------|--------|
| 1 | 2 | different | N | 23 | 0.31 | 不合并 | ✅ |
| 1 | 3 | semantic-translation | N | 22 | 0.00 | 不合并 | ⚠️ Miss |
| 1 | 4 | different | N | 28 | 0.44 | 不合并 | ✅ |
| 1 | 5 | different | N | 14 | 0.44 | 不合并 | ✅ |
| 1 | 6 | different | N | 34 | 0.31 | 不合并 | ✅ |
| 1 | 7 | different | N | 18 | 0.31 | 不合并 | ✅ |
| 1 | 8 | semantic-translation | N | 28 | 0.33 | 不合并 | ⚠️ Miss |
| 2 | 3 | different | N | 13 | 0.00 | 不合并 | ✅ |
| 2 | 4 | different | N | 27 | 0.20 | 不合并 | ✅ |
| 2 | 5 | different | N | 23 | 0.10 | 不合并 | ✅ |
| 2 | 6 | different | N | 21 | 0.50 | 不合并 | ✅ |
| 2 | 7 | verbatim | N | 15 | **1.00** | **合并** | ✅ |
| 2 | 8 | different | N | 13 | 0.45 | 不合并 | ✅ |
| 3 | 4 | different | N | 26 | 0.00 | 不合并 | ✅ |
| 3 | 5 | different | N | 28 | 0.00 | 不合并 | ✅ |
| 3 | 6 | different | N | 18 | 0.00 | 不合并 | ✅ |
| 3 | 7 | different | N | 18 | 0.00 | 不合并 | ✅ |
| 3 | 8 | verbatim | N | 12 | 0.00 | 不合并 | ⚠️ Miss |
| 4 | 5 | different | N | 30 | 0.26 | 不合并 | ✅ |
| 4 | 6 | semantic-translation | N | 26 | 0.19 | 不合并 | ⚠️ Miss |
| 4 | 7 | different | N | 24 | 0.20 | 不合并 | ✅ |
| 4 | 8 | different | N | 26 | 0.20 | 不合并 | ✅ |
| 5 | 6 | different | N | 34 | 0.10 | 不合并 | ✅ |
| 5 | 7 | different | N | 16 | 0.10 | 不合并 | ✅ |
| 5 | 8 | different | N | 28 | 0.11 | 不合并 | ✅ |
| 6 | 7 | different | N | 26 | 0.50 | 不合并 | ✅ |
| 6 | 8 | different | N | 16 | 0.48 | 不合并 | ✅ |
| 7 | 8 | different | N | 18 | 0.45 | 不合并 | ✅ |

## 基线合并组

```
[1]
[2, 7]   ← Jaccard title 完全相同（1.00）触发合并
[3]
[4]
[5]
[6]
[8]
```

## 统计

- URL 规范化合并对数：0（所有 URL 域名/路径不同）
- SimHash 合并对数：0（所有汉明距 ≥ 12，远超阈值 3）
- Jaccard 合并对数：1（对 2-7，title 完全相同）
- 总合并对数（去重）：1

## 混淆矩阵

将 semantic-translation + verbatim 视为应去重目标（GT Positive），different 视为 GT Negative：

|           | GT Positive | GT Negative |
| --------- | ----------: | ----------: |
| Merge     | 1 (TP)      | 0 (FP)      |
| Not Merge | 4 (FN)      | 23 (TN)     |

## 指标（P/R/F1）

| 指标 | 值 | 说明 |
|------|----|------|
| Precision | 1.00 (100%) | 1 次合并即正确，零误合并 |
| Recall | 0.20 (20%) | 5 个应去重对中检出 1 个 |
| F1 | 0.33 | 高精度低召回典型形态 |

**Baseline 性质定性**：高精度、低召回——"宁漏杀，不误杀"。与工业搜索引擎的传统 dedup 配置一致（URL 规范化、SimHash≤3、Jaccard≥0.9 三个阈值均设得很保守）。

## 关键发现

### 发现 1：FP = 0 是最值得强调的结果

在 23 个 different 对中**没有任何误合并**。三个保守阈值（URL 规范化严格、SimHash≤3、Jaccard≥0.9）联合作用使 baseline 呈现典型的"高精度低召回"特性。这意味着任何对 baseline 的改进方向都应聚焦于**提升召回**，而非担心精度下降。

### 发现 2：translation Miss 属于"算法边界"，非负面发现

3 个跨语言 translation 对（1-3, 1-8, 4-6）全部 Miss，SimHash 汉明距 22-28（阈值 3），Jaccard 0.00-0.19（阈值 0.9）。

**正确定性**：这是 lexical 方法的**已知算法边界**，不是算法失效。SimHash/shingling 基于句法 token 重叠，跨语言对的 token 集合完全不重叠（J(A_en, A_zh) ≈ 0），理论上必然 Miss。这与 Manning IR Book §19.6、Manku/Google WWW'07 的文献结论一致。

**不能表述为**："SimHash 无法识别 translation 同源"——这暗示算法缺陷。
**应表述为**："lexical dedup 不具备跨语言能力"——这是方法范式的固有边界。

### 发现 3：3-8 verbatim Miss 属于"数据限制"，不能推论算法无能

对 3-8（kubernetes.ac.cn 镜像 vs kubernetes.io/zh-cn 官方中文）为 verbatim 关系，但 baseline Miss（SimHash 汉明距 12，Jaccard 0.00）。

**正确定性**：本实验的输入是 **fetch 摘要而非完整正文**（§2 仅存摘要，与 Run #10 相同的归档问题）。测到的是"摘要级指纹"而非"文档级指纹"。SimHash 本来就是为**全文**近重复设计的，摘要截断破坏了经典设定。

**不能表述为**："SimHash 无法识别 verbatim mirror"——这推论过强，本实验数据不支持。
**应表述为**："在摘要替代正文条件下，verbatim mirror 未被检测到"——明确限定数据条件。

### 发现 4：2-7 是 baseline 唯一检出的对，且路径合理

对 2-7（腾讯云 Se7en258 vs CSDN cr7258，同一作者跨平台发布）通过 Jaccard=1.00（title 完全相同）触发合并。这是 baseline 设计目标内的正确行为——title 级 shingle 完全重叠是 verbatim 的强信号。

