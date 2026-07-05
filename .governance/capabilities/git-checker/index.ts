// index.ts — git-checker Capability 实现 (GV-6 §二)
// 检测工作目录 git 未 commit 文件堆积,触发 handoff 写入门控。
// 借鉴 context-snapshot/src/git-status-checker.ts,新造为零依赖纯函数。

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { GitCheckerInput, GitCheckerResult } from "./types.js";

export * from "./types.js";

/** git status --porcelain 输出行解析为文件路径 */
function parseGitStatus(output: string, excludePatterns?: string[]): string[] {
  const lines = output.trim().split("\n").filter((l) => l.length > 0);
  const files: string[] = [];
  for (const line of lines) {
    // porcelain 格式: XY <path>  (X=staged, Y=working tree)
    const filePath = line.slice(3).trim().replace(/^"(.*)"$/, "$1");
    if (excludePatterns?.some((p) => filePath.startsWith(p))) continue;
    files.push(filePath);
  }
  return files;
}

/** 获取当前 git 分支名 */
function getGitBranch(cwd: string): string | undefined {
  try {
    const output = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** 获取最近 commit hash */
function getLastCommitHash(cwd: string): string | undefined {
  try {
    const output = execSync("git rev-parse --short HEAD", {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function gitChecker(input: GitCheckerInput): Promise<GitCheckerResult> {
  const { ctx, event, args } = input;
  const cwd = ctx.cwd;

  // 非 git 仓库 → pass (不阻断,避免误伤)
  if (!existsSync(join(cwd, ".git"))) {
    return { intent: "pass" };
  }

  let output: string;
  try {
    output = execSync("git status --porcelain", {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    // git 命令失败 → pass (不阻断)
    return {
      intent: "pass",
      metadata: {
        error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      },
    };
  }

  const dirtyFiles = parseGitStatus(output, args.excludePatterns);
  const dirtyCount = dirtyFiles.length;
  const threshold = args.threshold;
  const gitBranch = getGitBranch(cwd);
  const lastCommitHash = getLastCommitHash(cwd);

  const metadata: NonNullable<GitCheckerResult["metadata"]> = {};
  if (gitBranch) metadata.gitBranch = gitBranch;
  if (lastCommitHash) metadata.lastCommitHash = lastCommitHash;

  // 阈值阻断 (PreToolUse)
  if (dirtyCount >= threshold && event.type === "PreToolUse") {
    return {
      intent: "block",
      data: {
        dirtyCount,
        dirtyFiles: dirtyFiles.slice(0, 20),
        threshold,
        reason: `未 commit 文件堆积 ≥ ${threshold}（当前 ${dirtyCount} 个），触发 handoff 写入门控（constitution §4 触发器 b）。请先执行：\n  1. git commit 现有改动，或\n  2. 写 HANDOFF.md 后 commit，或\n  3. 显式确认继续推进（用户明确要求时）`,
      },
      metadata,
    };
  }

  // SessionStart 注入感知
  if (event.type === "SessionStart") {
    return {
      intent: "inject",
      data: { dirtyCount, dirtyFiles: dirtyFiles.slice(0, 20), threshold },
      metadata,
    };
  }

  // 默认 pass
  return {
    intent: "pass",
    data: { dirtyCount, threshold },
    metadata,
  };
}
