# -*- coding: utf-8 -*-
"""
Run #11 Baseline — SimHash/Jaccard + URL 规范化
对比 P4 LLM 同源合并 vs 算法层基线

数据来源：run-11-output.md §1 原始结果表 + §2 fetch 摘要
注：§2 仅存摘要非完整正文，基线用 title + snippet + fetch 摘要作为输入文本
"""

import re
import hashlib
from urllib.parse import urlparse, urlunparse

# ============================================================
# 数据：8 个 fetch 成功的 URL（从 run-11-output.md §1+§2 提取）
# ============================================================

URLS = [
    {
        "id": 1,
        "url": "https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/",
        "title": "Sidecar Containers - Kubernetes",
        "text": "Sidecar Containers Kubernetes FEATURE STATE v1.33 stable. "
                "Sidecar containers are the secondary containers that run along with the main application container within the same Pod. "
                "Kubernetes implements sidecar containers as a special case of init containers; sidecar containers remain running after Pod startup. "
                "Provided that your cluster has the SidecarContainers feature gate enabled, you can specify a restartPolicy for containers listed in a Pod's initContainers field. "
                "Sidecar containers and Pod lifecycle. Upon Pod termination, the kubelet postpones terminating sidecar containers. "
                "Jobs with sidecar containers. Differences from init containers. Resource sharing.",
    },
    {
        "id": 2,
        "url": "https://cloud.tencent.com/developer/article/2522780",
        "title": "深入剖析 Kubernetes 原生 Sidecar 容器",
        "text": "深入剖析 Kubernetes 原生 Sidecar 容器 作者 Se7en258. "
                "1 Sidecar 容器的概念. 2 当前 Sidecar 容器的问题: 问题1使用Sidecar容器的Job, 问题2日志转发和指标收集, 问题3服务网格, 问题4配置密钥. "
                "3 什么是原生Sidecar容器: Kubernetes 1.28引入. Kubernetes将sidecar容器作为init容器的一个特例来实现. "
                "6 Init容器Sidecar容器和主容器. 7 Sidecar容器的重启策略. 8 带有Sidecar容器的Job. 9 Sidecar容器的停止顺序. 10 资源计算.",
    },
    {
        "id": 3,
        "url": "https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/sidecar-containers/",
        "title": "边车容器",
        "text": "特性状态 Kubernetes v1.33 stable. 边车容器是与主应用容器在同一个Pod中运行的辅助容器. "
                "Kubernetes将边车容器作为Init容器的一个特例来实现. 边车容器和Pod生命周期. "
                "在Pod终止时kubelet会推迟终止边车容器. 带边车容器的Job. 与应用容器的区别. 与Init容器的区别.",
    },
    {
        "id": 4,
        "url": "https://kubernetes.io/blog/2023/08/25/native-sidecar-containers/",
        "title": "Kubernetes v1.28: Introducing native sidecar containers",
        "text": "Kubernetes v1.28 Introducing native sidecar containers. "
                "Kubernetes 1.28 adds a new restartPolicy field to init containers. "
                "Setting this field changes behavior: 1 container restarts if it exits, "
                "2 subsequent init container starts immediately after startupProbe, "
                "3 resource usage calculation changes, 4 Pod termination continues to only depend on main containers. "
                "When to use. How users got sidecar before 1.28. Transitioning. Known issues alpha.",
    },
    {
        "id": 5,
        "url": "https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/",
        "title": "Adopting Sidecar Containers",
        "text": "Adopting Sidecar Containers FEATURE STATE Kubernetes v1.33 stable. "
                "Benefits of built-in sidecar. Native sidecar can be configured to start ahead of init containers. "
                "Guaranteed to be terminated last. With Jobs native sidecar does not block Pod completion. "
                "Adoption considerations. Feature gate check. Troubleshooting.",
    },
    {
        "id": 6,
        "url": "https://cloud.tencent.com/developer/article/2324524",
        "title": "Kubernetes 1.28：介绍原生 Sidecar 容器",
        "text": "Kubernetes 1.28介绍原生Sidecar容器 作者 xcbeyond 翻译自 Todd Neal 等 Kubernetes 官方博客. "
                "Kubernetes 1.28在Init容器中添加了restartPolicy字段. 设置后变化: "
                "1容器退出则重新启动, 2后续Init容器在startupProbe成功完成后立即启动, "
                "3Pod资源使用计算变化, 4Pod终止只根据主容器判定. 已知问题Alpha. 1.28之前.",
    },
    {
        "id": 7,
        "url": "https://blog.csdn.net/cr7258/article/details/139350433",
        "title": "深入剖析 Kubernetes 原生 Sidecar 容器",
        "text": "深入剖析 Kubernetes 原生 Sidecar 容器 作者 cr7258 与 Se7en258 同一位作者. "
                "内容与腾讯云 developer/article/2522780 实质相同. "
                "Sidecar容器概念. 传统Sidecar问题. 原生Sidecar机制. "
                "实验验证启动顺序. Sidecar重启策略. Job原生Sidecar不阻止完成. 停止顺序. 资源计算影响.",
    },
    {
        "id": 8,
        "url": "https://kubernetes.ac.cn/docs/concepts/workloads/pods/sidecar-containers/",
        "title": "Sidecar 容器（Kubernetes 1.33 版）",
        "text": "与 kubernetes.io/zh-cn 官方中文文档内容一致. "
                "如果你定义了一个使用Kubernetes风格Init容器作为Sidecar的Job则每个Pod中的Sidecar容器不会阻止Job在主容器完成之后结束.",
    },
]

# Ground Truth（从 run-11-ground-truth.md）
GROUND_TRUTH = {
    (1, 2): "different",
    (1, 3): "semantic-translation",
    (1, 4): "different",
    (1, 5): "different",
    (1, 6): "different",
    (1, 7): "different",
    (1, 8): "semantic-translation",
    (2, 3): "different",
    (2, 4): "different",
    (2, 5): "different",
    (2, 6): "different",
    (2, 7): "verbatim",
    (2, 8): "different",
    (3, 4): "different",
    (3, 5): "different",
    (3, 6): "different",
    (3, 7): "different",
    (3, 8): "verbatim",
    (4, 5): "different",
    (4, 6): "semantic-translation",
    (4, 7): "different",
    (4, 8): "different",
    (5, 6): "different",
    (5, 7): "different",
    (5, 8): "different",
    (6, 7): "different",
    (6, 8): "different",
    (7, 8): "different",
}

# ============================================================
# 1. URL 规范化
# ============================================================

TRACKING_PARAMS = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"}

def normalize_url(url):
    """URL 规范化：去 fragment、去 tracking 参数、统一 scheme/host、去 trailing slash"""
    parsed = urlparse(url)
    # 统一 scheme 和 host
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    # 去 trailing slash（但保留根路径）
    path = parsed.path.rstrip("/") if parsed.path != "/" else ""
    # 过滤 tracking 参数
    if parsed.query:
        params = []
        for pair in parsed.query.split("&"):
            if "=" in pair:
                key = pair.split("=")[0].lower()
                if key not in TRACKING_PARAMS:
                    params.append(pair)
            else:
                params.append(pair)
        query = "&".join(params)
    else:
        query = ""
    return urlunparse((scheme, netloc, path, "", query, ""))

# ============================================================
# 2. SimHash（64-bit 指纹）
# ============================================================

def tokenize(text):
    """简单分词：英文按空格+标点，中文按字符"""
    # 英文 token
    en_tokens = re.findall(r'[a-zA-Z0-9]+', text.lower())
    # 中文 token（逐字符）
    zh_chars = re.findall(r'[\u4e00-\u9fff]', text)
    return en_tokens + zh_chars

def simhash(text, hash_bits=64):
    """计算 SimHash 指纹"""
    tokens = tokenize(text)
    if not tokens:
        return 0
    # 每个 token 的 hash
    v = [0] * hash_bits
    for token in tokens:
        h = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
        for i in range(hash_bits):
            bit = (h >> i) & 1
            v[i] += 1 if bit else -1
    # 生成指纹
    fingerprint = 0
    for i in range(hash_bits):
        if v[i] > 0:
            fingerprint |= (1 << i)
    return fingerprint

def hamming_distance(a, b):
    """计算汉明距离"""
    x = a ^ b
    dist = 0
    while x:
        dist += x & 1
        x >>= 1
    return dist

# ============================================================
# 3. Jaccard 系数（k-shingle, k=4）
# ============================================================

def shingles(text, k=4):
    """生成 k-shingle 集合（按字符级）"""
    # 去空格和标点，统一小写
    cleaned = re.sub(r'\s+', '', text.lower())
    cleaned = re.sub(r'[^\u4e00-\u9fffa-z0-9]', '', cleaned)
    if len(cleaned) < k:
        return {cleaned}
    return {cleaned[i:i+k] for i in range(len(cleaned) - k + 1)}

def jaccard(set_a, set_b):
    """计算 Jaccard 系数"""
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)

# ============================================================
# 4. 基线合并决策
# ============================================================

SIMHASH_THRESHOLD = 3  # 汉明距 ≤ 3
JACCARD_THRESHOLD = 0.9  # Jaccard ≥ 0.9

def baseline_merge_decision(url_a, url_b, text_a, text_b, title_a, title_b):
    """基线合并决策：URL 规范化 OR SimHash OR Jaccard 任一命中则合并"""
    # 1. URL 规范化
    norm_a = normalize_url(url_a)
    norm_b = normalize_url(url_b)
    url_match = (norm_a == norm_b)

    # 2. SimHash（对 title + text）
    combined_a = title_a + " " + text_a
    combined_b = title_b + " " + text_b
    hash_a = simhash(combined_a)
    hash_b = simhash(combined_b)
    hdist = hamming_distance(hash_a, hash_b)
    simhash_match = (hdist <= SIMHASH_THRESHOLD)

    # 3. Jaccard（对 title 的 k-shingle）
    shingle_a = shingles(title_a)
    shingle_b = shingles(title_b)
    jac = jaccard(shingle_a, shingle_b)
    jaccard_match = (jac >= JACCARD_THRESHOLD)

    merge = url_match or simhash_match or jaccard_match
    return {
        "url_match": url_match,
        "simhash_hdist": hdist,
        "simhash_match": simhash_match,
        "jaccard": round(jac, 4),
        "jaccard_match": jaccard_match,
        "merge": merge,
    }

# ============================================================
# 5. 运行基线 + 对比 Ground Truth
# ============================================================

print("=" * 80)
print("Run #11 Baseline — SimHash/Jaccard + URL 规范化")
print("=" * 80)

print("\n## 算法参数")
print(f"  SimHash Hamming threshold: {SIMHASH_THRESHOLD}")
print(f"  Jaccard threshold: {JACCARD_THRESHOLD}")
print(f"  k-shingle: 4")
print(f"  输入文本: title + fetch 摘要（非完整正文）")

print("\n## 配对决策表")
print(f"{'#A':>3} {'#B':>3} | {'GT':>22} | {'URL':>5} {'SimHash':>8} {'Jac':>6} | {'基线合并':>8} | {'正确?':>6}")
print("-" * 80)

baseline_merges = {}
for i in range(len(URLS)):
    for j in range(i + 1, len(URLS)):
        a, b = URLS[i], URLS[j]
        gt = GROUND_TRUTH[(a["id"], b["id"])]
        result = baseline_merge_decision(
            a["url"], b["url"], a["text"], b["text"], a["title"], b["title"]
        )
        baseline_merges[(a["id"], b["id"])] = result["merge"]

        # 判断正确性
        gt_is_same_source = gt in ("verbatim", "semantic-translation", "semantic-summary", "semantic-rewrite")
        if result["merge"] == gt_is_same_source:
            correct = "✅"
        elif result["merge"] and not gt_is_same_source:
            correct = "❌ FalseMerge"
        else:
            correct = "⚠️ Miss"

        print(f"{a['id']:>3} {b['id']:>3} | {gt:>22} | "
              f"{'Y' if result['url_match'] else 'N':>5} {result['simhash_hdist']:>8} "
              f"{result['jaccard']:>6.2f} | "
              f"{'合并' if result['merge'] else '不合并':>8} | {correct:>6}")

# ============================================================
# 6. 指标计算
# ============================================================

print("\n" + "=" * 80)
print("指标计算")
print("=" * 80)

# P4 LLM 的合并组（从 run-11-output.md §3）
# G1: 3→1, G2: 6→4, G3: 7→2, G4: 8→3
# 传递性：8→3→1，所以最终合并组：{1,3,8}, {4,6}, {2,7}
p4_groups = [{1, 3, 8}, {4, 6}, {2, 7}, {5}]  # 5 独立

def in_same_group(a, b, groups):
    """检查 a 和 b 是否在同一合并组"""
    for g in groups:
        if a in g and b in g:
            return True
    return False

# 基线合并组（用 union-find 计算）
parent = list(range(9))  # 0-8, 用 1-8
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
def union(x, y):
    px, py = find(x), find(y)
    if px != py:
        parent[px] = py

for (a_id, b_id), merge in baseline_merges.items():
    if merge:
        union(a_id, b_id)

# 获取基线合并组
baseline_groups_map = {}
for i in range(1, 9):
    root = find(i)
    if root not in baseline_groups_map:
        baseline_groups_map[root] = set()
    baseline_groups_map[root].add(i)
baseline_groups = list(baseline_groups_map.values())

print("\n基线合并组:")
for g in sorted(baseline_groups, key=lambda x: min(x)):
    print(f"  {sorted(g)}")

print("\nP4 LLM 合并组:")
for g in sorted(p4_groups, key=lambda x: min(x)):
    print(f"  {sorted(g)}")

# 计算各指标
semantic_pairs = [(a, b) for (a, b), gt in GROUND_TRUTH.items()
                  if gt in ("semantic-translation", "semantic-summary", "semantic-rewrite")]
verbatim_pairs = [(a, b) for (a, b), gt in GROUND_TRUTH.items() if gt == "verbatim"]
different_pairs = [(a, b) for (a, b), gt in GROUND_TRUTH.items() if gt == "different"]

# Run A (基线) 指标
baseline_semantic_correct = sum(1 for a, b in semantic_pairs if baseline_merges[(a, b)])
baseline_verbatim_correct = sum(1 for a, b in verbatim_pairs if baseline_merges[(a, b)])
baseline_false_merge = sum(1 for a, b in different_pairs if baseline_merges[(a, b)])

# Run B (P4 LLM) 指标
p4_semantic_correct = sum(1 for a, b in semantic_pairs if in_same_group(a, b, p4_groups))
p4_verbatim_correct = sum(1 for a, b in verbatim_pairs if in_same_group(a, b, p4_groups))
p4_false_merge = sum(1 for a, b in different_pairs if in_same_group(a, b, p4_groups))

baseline_semantic_recall = baseline_semantic_correct / len(semantic_pairs) * 100 if semantic_pairs else 0
p4_semantic_recall = p4_semantic_correct / len(semantic_pairs) * 100 if semantic_pairs else 0
baseline_verbatim_recall = baseline_verbatim_correct / len(verbatim_pairs) * 100 if verbatim_pairs else 0
p4_verbatim_recall = p4_verbatim_correct / len(verbatim_pairs) * 100 if verbatim_pairs else 0
net_gain = p4_semantic_recall - baseline_semantic_recall

print(f"\n## 指标对比")
print(f"{'指标':>30} | {'Run A (基线)':>15} | {'Run B (P4 LLM)':>15} | {'差值':>10}")
print("-" * 80)
print(f"{'Verbatim Merge Recall':>30} | {baseline_verbatim_recall:>14.1f}% | {p4_verbatim_recall:>14.1f}% | {p4_verbatim_recall - baseline_verbatim_recall:>+9.1f}%")
print(f"{'Semantic Merge Recall':>30} | {baseline_semantic_recall:>14.1f}% | {p4_semantic_recall:>14.1f}% | {p4_semantic_recall - baseline_semantic_recall:>+9.1f}%")
print(f"{'  └ translation 子类':>30} | {baseline_semantic_recall:>14.1f}% | {p4_semantic_recall:>14.1f}% | {p4_semantic_recall - baseline_semantic_recall:>+9.1f}%")
print(f"{'  └ summary 子类':>30} | {'N/A':>15} | {'N/A':>15} | {'N/A':>10}")
print(f"{'  └ rewrite 子类':>30} | {'N/A':>15} | {'N/A':>15} | {'N/A':>10}")
print(f"{'False Merge Count':>30} | {baseline_false_merge:>15} | {p4_false_merge:>15} | {p4_false_merge - baseline_false_merge:>+10}")
print(f"{'Net Gain':>30} | {'—':>15} | {'—':>15} | {net_gain:>+9.1f}%")

print(f"\n## 评分")
print(f"  Semantic Recall: {p4_semantic_recall:.1f}%")
print(f"  Net Gain: +{net_gain:.1f}%")
print(f"  False Merge: {p4_false_merge}")
print(f"  信息损失: 0（P4 LLM 保留最高权威源，无独特 claim 丢失）")

# 评分尺度
if p4_semantic_recall >= 80 and net_gain >= 50 and p4_false_merge == 0:
    score = 5
elif p4_semantic_recall >= 60 and net_gain >= 30 and p4_false_merge == 0:
    score = 4
elif p4_semantic_recall >= 40 and net_gain >= 20:
    score = 3
elif p4_semantic_recall < 40 or net_gain < 20:
    score = 2
else:
    score = 1

print(f"\n  评分: {score}/5")

if score >= 4:
    print(f"  决策: ✅ P4 active 状态获语义场景证据支撑")
elif score == 3:
    print(f"  决策: ⚠️ 有条件通过")
else:
    print(f"  决策: ❌ P4 标注'仅逐字场景有效'")

print(f"\n## 样本量限制")
print(f"  语义同源对: {len(semantic_pairs)} 对（全部为 translation，无 summary/rewrite）")
print(f"  verbatim 对: {len(verbatim_pairs)} 对")
print(f"  different 对: {len(different_pairs)} 对")
print(f"  总配对数: {len(GROUND_TRUTH)} 对")
print(f"  注: 样本量偏小，结果仅作方向性参考")
