#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全仓 Markdown 链接 + 锚点校验（dev-rules.md §1.17 规范性引用完整性门控的执行工具）

用法：
    python scripts/check_links_anchors.py [仓库根目录]

判据：
    - 链接：目标文件必须存在
    - 锚点：`#fragment` 必须能匹配目标文件中的真实标题（GitHub 风格 slug）
    - 范围：`docs/archive/**` 与 `.governance/` 归档类副本按 §1.17「不适用范围」豁免，
      仅报告、不计入失败

退出码：
    0  非归档树中无失效链接与锚点（归档区残留仅提示）
    1  存在必须修复的失效引用
"""
import os
import re
import sys
import json
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", ".npm-cache", "build", "dist", "out", ".vscode-test"}
LINK_RE = re.compile(r"\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
EXEMPT_PREFIXES = ("docs/archive/", "docs\\archive\\")


def slug(title: str) -> str:
    """GitHub 风格标题锚点：小写、去标点、空格转连字符（CJK 按字母处理）。"""
    s = title.strip().lower()
    s = re.sub(r"`([^`]*)`", r"\1", s)
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = "".join(ch for ch in s if ch.isalnum() or ch in " -_")
    return s.replace(" ", "-")


def collect_anchors(path: Path):
    anchors = set()
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            m = HEADING_RE.match(line.rstrip("\n"))
            if m:
                anchors.add(slug(m.group(2)))
    return anchors


def is_exempt(rel: str) -> bool:
    rel = rel.replace("\\", "/")
    return rel.startswith("docs/archive/")


def main() -> int:
    if len(sys.argv) > 1:
        root = Path(sys.argv[1]).resolve()
    else:
        root = Path(__file__).resolve().parents[1]

    md_files = []
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if fn.lower().endswith(".md"):
                md_files.append(Path(dirpath) / fn)

    anchor_cache = {}
    broken_file, broken_anchor = [], []
    total = ok = 0

    for path in md_files:
        rel_src = os.path.relpath(path, root).replace("\\", "/")
        text = path.read_text(encoding="utf-8", errors="replace")
        for m in LINK_RE.finditer(text):
            target = m.group(2).strip()
            line_no = text[: m.start()].count("\n") + 1
            if target.startswith(("http://", "https://", "mailto:", "file://")):
                continue
            if target.startswith("#"):
                total += 1
                frag = target[1:]
                if frag and frag not in anchor_cache.setdefault(rel_src, collect_anchors(path)):
                    broken_anchor.append((rel_src, line_no, target))
                else:
                    ok += 1
                continue
            total += 1
            file_part, _, frag = target.partition("#")
            if os.path.isabs(file_part):
                continue
            resolved = (path.parent / file_part).resolve()
            if not resolved.exists():
                broken_file.append((rel_src, line_no, target))
                continue
            if frag and resolved.suffix.lower() == ".md":
                rel_tgt = os.path.relpath(resolved, root).replace("\\", "/")
                if rel_tgt not in anchor_cache:
                    anchor_cache[rel_tgt] = collect_anchors(resolved)
                if frag not in anchor_cache[rel_tgt]:
                    broken_anchor.append((rel_src, line_no, target))
                    continue
            ok += 1

    must_fix = [x for x in broken_file + broken_anchor if not is_exempt(x[0])]
    exempt = [x for x in broken_file + broken_anchor if is_exempt(x[0])]

    print(json.dumps({
        "root": str(root),
        "scanned_md": len(md_files),
        "links_checked": total,
        "resolvable": ok,
        "must_fix": len(must_fix),
        "exempt_archive_residue": len(exempt),
    }, ensure_ascii=False, indent=2))

    if must_fix:
        print("\n=== 必须修复 ===")
        for s, l, t in must_fix:
            print(f"{s}:{l}  ->  {t}")

    if exempt:
        print(f"\n=== 归档区残留 {len(exempt)} 处（§1.17 不适用范围，仅记录）===")
        buckets = {}
        for s, _, _ in exempt:
            top = "/".join(s.split("/")[:2])
            buckets[top] = buckets.get(top, 0) + 1
        for k, v in sorted(buckets.items(), key=lambda kv: -kv[1]):
            print(f"  {k}: {v}")
    else:
        print("\n归档区无残留。")

    print("\n结果：" + ("PASS（非归档树 0 失效）" if not must_fix else f"FAIL（{len(must_fix)} 处须修）"))
    return 0 if not must_fix else 1


if __name__ == "__main__":
    sys.exit(main())
