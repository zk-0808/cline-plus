# -*- coding: utf-8 -*-
"""
Shared baseline evaluation utilities for search-orchestrator experiments.

Algorithms: URL normalization, SimHash, Jaccard, k-shingles, union-find.
Used by run-11-baseline.py and run-12b-baseline.py.
"""

from __future__ import annotations

import hashlib
import re
from urllib.parse import urlparse, urlunparse

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TRACKING_PARAMS = frozenset({
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid",
})

SIMHASH_THRESHOLD = 3       # Hamming distance ≤ 3 → similar
JACCARD_THRESHOLD = 0.9     # Jaccard ≥ 0.9 → similar
SHINGLE_WIDTH = 4           # Default character-level shingle width
HASH_BITS = 64              # SimHash fingerprint width

# ---------------------------------------------------------------------------
# Hash primitives
# ---------------------------------------------------------------------------


def hash_md5(token: str) -> int:
    """MD5 → int (used by run-11 SimHash)."""
    return int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)


def hash_blake2b(token: str) -> int:
    """Blake2b 8-byte → int (used by run-12b SimHash)."""
    return int.from_bytes(
        hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest(), "big",
    )


# ---------------------------------------------------------------------------
# URL normalization
# ---------------------------------------------------------------------------


def normalize_url(url: str) -> str:
    """Full normalization: strip fragment, tracking params, unify scheme/host."""
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/") if parsed.path != "/" else ""
    if parsed.query:
        pairs = []
        for pair in parsed.query.split("&"):
            if "=" in pair:
                key = pair.split("=")[0].lower()
                if key not in TRACKING_PARAMS:
                    pairs.append(pair)
            else:
                pairs.append(pair)
        query = "&".join(pairs)
    else:
        query = ""
    return urlunparse((scheme, netloc, path, "", query, ""))


def normalize_url_simple(url: str) -> str:
    """Minimal normalization: strip www., lowercase host, remove trailing /."""
    parsed = urlparse(url.strip())
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = re.sub(r"/+$", "", parsed.path)
    return f"{host}{path}"


# ---------------------------------------------------------------------------
# Text primitives
# ---------------------------------------------------------------------------


def tokenize(text: str) -> list[str]:
    """Split into English alphanumeric tokens + individual Chinese chars."""
    en = re.findall(r"[a-zA-Z0-9]+", text.lower())
    zh = re.findall(r"[\u4e00-\u9fff]", text)
    return en + zh


def shingles(text: str, k: int = SHINGLE_WIDTH) -> set[str]:
    """Character-level k-shingle set. Strips whitespace and punctuation."""
    cleaned = re.sub(r"\s+", "", text.lower())
    cleaned = re.sub(r"[^\u4e00-\u9fffa-z0-9]", "", cleaned)
    if len(cleaned) < k:
        return {cleaned} if cleaned else set()
    return {cleaned[i : i + k] for i in range(len(cleaned) - k + 1)}


# ---------------------------------------------------------------------------
# SimHash
# ---------------------------------------------------------------------------


def simhash(
    tokens: set[str] | list[str],
    hash_fn=hash_md5,
    bits: int = HASH_BITS,
) -> int:
    """Compute SimHash fingerprint from a token collection."""
    if not tokens:
        return 0
    v = [0] * bits
    for token in tokens:
        h = hash_fn(token)
        for i in range(bits):
            v[i] += 1 if (h >> i) & 1 else -1
    fp = 0
    for i in range(bits):
        if v[i] > 0:
            fp |= 1 << i
    return fp


# ---------------------------------------------------------------------------
# Similarity metrics
# ---------------------------------------------------------------------------


def hamming_distance(a: int, b: int) -> int:
    """Hamming distance via popcount."""
    return (a ^ b).bit_count()


def jaccard(set_a: set[str], set_b: set[str]) -> float:
    """Jaccard similarity coefficient."""
    if not set_a and not set_b:
        return 1.0
    union = len(set_a | set_b)
    return len(set_a & set_b) / union if union else 0.0


# ---------------------------------------------------------------------------
# Union-Find
# ---------------------------------------------------------------------------


def union_find_groups(
    pairs: dict[tuple[int, int], bool], id_range: range,
) -> list[set[int]]:
    """Compute connected components from merge decisions via union-find."""
    parent = {x: x for x in id_range}

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for (a, b), merge in pairs.items():
        if merge:
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb

    groups: dict[int, set[int]] = {}
    for x in id_range:
        r = find(x)
        groups.setdefault(r, set()).add(x)
    return list(groups.values())
