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
    - 范围（第二条）：只扫**仓库自己的**文档 —— 未跟踪且被 `.gitignore` 忽略的文件不算。
      理由见 `collect_md_files`：草稿目录里的临时文件不该改变门禁结论文。

退出码：
    0  非归档树中无失效链接与锚点（归档区残留仅提示）
    1  存在必须修复的失效引用
"""
import os
import re
import sys
import json
import subprocess
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


def submodule_paths(root: Path):
    """子模块路径（`git ls-files --stage` 里 mode 160000 的那些）。"""
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "ls-files", "-z", "--stage"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
    except (OSError, subprocess.SubprocessError):
        return []
    subs = []
    for rec in proc.stdout.split("\0"):
        meta, _, path = rec.partition("\t")
        if meta.startswith("160000") and path:
            subs.append(path)
    return subs


def ignored_dirs(root: Path, rel_dirs):
    """哪些目录被 .gitignore 忽略了（一次 git 调用问完）。

    为什么问"目录下的一个假文件"而不是目录本身：
    `experiments/` 这类"仅目录"规则对 `check-ignore experiments/` 与 `check-ignore experiments`
    的匹配随 `-z` / 参数形式而变，实测两种写法都返回"未忽略"，很不可靠。
    `experiments/__probe__.md` 这种形式稳定命中，且 git 不要求路径真实存在。

    为什么不干脆用 `git ls-files --exclude-standard` 定范围：那会漏掉**子模块**里的
    Markdown（`context-snapshot/` 就是一个）。这里保留原来的全盘遍历范围，只剪掉草稿目录。

    为什么不把子模块路径一起问：`check-ignore` 遇到子模块里的路径直接 `fatal` 退出，
    而且**排在它后面的探针不再求值**——一次 fatal 就能让整个忽略清单变成残缺的。
    """
    subs = submodule_paths(root)
    probes = [
        d + "__probe__.md" for d in rel_dirs
        if not any(d.startswith(s + "/") or d == s for s in subs)
    ]
    if not probes:
        return set()
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "check-ignore", "-z", "--stdin"],
            input="\0".join(probes) + "\0",
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
    except (OSError, subprocess.SubprocessError):
        return set()
    return {
        p[: -len("__probe__.md")].rstrip("/")
        for p in proc.stdout.split("\0")
        if p.endswith("__probe__.md")
    }


def tracked_paths(root: Path):
    """已跟踪文件集合。**被跟踪的文件不受 .gitignore 影响**——它已经在仓库里了。"""
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "ls-files", "-z"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return {p for p in proc.stdout.split("\0") if p.strip()}


def collect_md_files(root: Path):
    """扫描范围：全仓 Markdown，**减去"未跟踪且被 .gitignore 忽略"的文件**。

    为什么不用"全盘遍历"：
    `.gitignore` 里的草稿目录（`experiments/` 是 P5 沙盒、`docs/experiments/` 是草稿）
    永远不会进入仓库，但全盘遍历会把它们算进来。2026-10-18 就发生过一次：别的会话往
    `experiments/` 丢了 4 份临时译文，门禁从 PASS 变成 FAIL(93)，而被指的链接全都指向
    沙盒之外。这属于"门禁结论依赖与仓库无关的工作区文件"——和 verify-governance 的 T4
    那条 ambient-dependent 缺陷同一类：门禁不该是环境状态的函数。

    注意"已跟踪"优先：`experiments/` 这条规则也会命中 `docs/archive/search/experiments/`
    这类**已跟踪**的归档目录，按"被忽略"一律剪掉会漏掉 36 份归档文档（归档残留计数会
    从 185 掉到 149）。忽略规则只对未跟踪文件生效，这里必须照这个语义来。

    git 不可用（或此处不是仓库）时不剪枝：宁可多扫，不可漏扫。
    """
    md_files, rel_dirs = [], []
    for dirpath, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for d in dirs:
            rel_dirs.append(os.path.relpath(os.path.join(dirpath, d), root).replace("\\", "/") + "/")
        for fn in names:
            if fn.lower().endswith(".md"):
                md_files.append(Path(dirpath) / fn)

    rels = [os.path.relpath(f, root).replace("\\", "/") for f in md_files]
    tracked = tracked_paths(root)
    if tracked is None:
        return md_files, "全盘遍历（git 不可用，未剪枝）"

    ignored = ignored_dirs(root, rel_dirs)
    if not ignored:
        return md_files, "全盘遍历（未剪枝）"

    def dropped(rel: str) -> bool:
        if rel in tracked:
            return False
        return any(rel.startswith(f"{d}/") for d in ignored)

    kept = [f for f, rel in zip(md_files, rels) if not dropped(rel)]
    return kept, f"全盘遍历，剪掉 {len(md_files) - len(kept)} 份未跟踪的忽略文件（{len(ignored)} 个被忽略目录）"


def main() -> int:
    if len(sys.argv) > 1:
        root = Path(sys.argv[1]).resolve()
    else:
        root = Path(__file__).resolve().parents[1]

    md_files, scope = collect_md_files(root)

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
        "scope": scope,
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
