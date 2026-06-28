# Run #12b Baseline — SimHash/Jaccard + URL 规范化

## 算法参数

| 参数 | 值 |
|------|----|
| URL 规范化 | scheme 去除，host 小写，去 www，path 去尾部斜杠 |
| SimHash | title/url + 正文归档文本，字符 5-shingle，64-bit，汉明距离 ≤ 3 |
| Jaccard 主阈值 | 字符 5-shingle，Jaccard ≥ 0.90 |
| Jaccard sensitivity | 字符 5-shingle，Jaccard ≥ 0.80，仅报告，不计主合并 |
| 输入 URL 数 | 14 个成功 fetch URL |

## 合并决策表

| #A | #B | URL 规范化 | SimHash 汉明距 | Jaccard | Jaccard 0.80 sensitivity | 合并决策 | 保留 |
|----|----|------------|----------------|---------|---------------------------|----------|------|
| #1 | #6 | 否 | 28 | 0.046 | 否 | 不合并 | #— |
| #1 | #9 | 否 | 28 | 0.126 | 否 | 不合并 | #— |
| #1 | #10 | 否 | 31 | 0.157 | 否 | 不合并 | #— |
| #1 | #11 | 否 | 25 | 0.053 | 否 | 不合并 | #— |
| #3 | #7 | 否 | 27 | 0.070 | 否 | 不合并 | #— |

## 统计

- URL 规范化合并对数：0
- SimHash 合并对数：0
- Jaccard 0.90 合并对数：0
- 总合并对数（去重）：0
- Jaccard 0.80 sensitivity 额外命中：0

## 与 Ground Truth 对比

- GT 主指标 positive pair：5
- Baseline 命中 positive pair：0
- Precision：1.00
- Recall：0.00
- F1：0.00
- Summary Recall：0.00
- Rewrite Recall：0.00
- False Merge Count：0
- Information Loss：0

## 命中/漏检主指标 pair

| Pair | GT 类型 | Baseline 决策 |
|------|---------|---------------|
| #1-#6 | summary | 漏检 |
| #1-#9 | rewrite | 漏检 |
| #1-#10 | rewrite | 漏检 |
| #1-#11 | summary | 漏检 |
| #3-#7 | summary | 漏检 |
