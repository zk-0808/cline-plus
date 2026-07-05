// rule-appender — 经验追加 Capability (L3),实现 capabilities/README.md §五 算法。零依赖。

import { promises as fs, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { RuleAppenderInput, RuleAppenderResult } from "./types.ts";

const SECTION_HEADER = "## 待沉淀经验";
const TABLE_HEADER = "| id | 经验 | 来源 | 沉淀日期 | 状态 |";
const TABLE_SEPARATOR = "|----|------|------|---------|------|";
const SECTION_NOTE =
  "> 此区由 rule-appender 自动追加,人工 review 后晋升到 rules/ 或删除。\n> 晋升流程见 .governance/rules/lifecycle.md。";
const EMPTY_HANDOFF_TEMPLATE = `# Handoff — 会话交接

> 此文件由 rule-appender 等工具维护。

---

${SECTION_HEADER}

${SECTION_NOTE}

${TABLE_HEADER}
${TABLE_SEPARATOR}
`;

const MAX_RETRIES = 3, RETRY_DELAY_MS = 100;

function validateId(id: string): string | null {
  if (id.includes("|") || id.includes("\n") || id.includes("\r")) return "id 含非法字符(| 或换行)";
  if (id.trim().length === 0) return "id 不能为空";
  return null;
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function makeRow(id: string, content: string, source: string, date: string): string {
  return `| ${escapeCell(id)} | ${escapeCell(content)} | ${escapeCell(source)} | ${date} | 待 review |`;
}

function isSeparatorLine(line: string): boolean {
  return /^\s*\|[-:\s|]+\|\s*$/.test(line);
}

function isHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return false;
  const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
  return cells[0] === "id";
}

async function writeFileWithRetry(path: string, content: string): Promise<string | null> {
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await fs.writeFile(path, content, "utf-8");
      return null;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  return lastError;
}

// 定位 "## 待沉淀经验" section
function locateSection(content: string): {
  before: string;
  sectionLines: string[];
  after: string;
  found: boolean;
} {
  const lines = content.split("\n");
  const headerIdx = lines.findIndex((line) => /^##\s+待沉淀经验\s*$/.test(line));
  if (headerIdx === -1) return { before: content, sectionLines: [], after: "", found: false };
  let nextIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i]) && !/^###/.test(lines[i])) { nextIdx = i; break; }
  }
  return {
    before: lines.slice(0, headerIdx).join("\n"),
    sectionLines: lines.slice(headerIdx, nextIdx),
    after: lines.slice(nextIdx).join("\n"),
    found: true,
  };
}

// 处理 section 内表格
function processSection(
  sectionLines: string[],
  experience: { id: string; content: string; source: string },
  overwrite: boolean,
): { newLines: string[]; appended: boolean; duplicateId?: string } {
  const newRow = makeRow(experience.id, experience.content, experience.source, new Date().toISOString());
  let separatorIdx = -1;
  for (let i = 0; i < sectionLines.length; i++) {
    if (isSeparatorLine(sectionLines[i])) { separatorIdx = i; break; }
  }
  if (separatorIdx === -1) {
    // section 无表格,在末尾追加完整表格
    let lastIdx = sectionLines.length - 1;
    while (lastIdx >= 0 && sectionLines[lastIdx].trim() === "") lastIdx--;
    return {
      newLines: [...sectionLines.slice(0, lastIdx + 1), "", TABLE_HEADER, TABLE_SEPARATOR, newRow],
      appended: true,
    };
  }
  // 收集 separator 之后的数据行
  const dataRows: { idx: number; id: string }[] = [];
  for (let i = separatorIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || isSeparatorLine(line) || isHeaderLine(line)) continue;
    const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
    if (cells.length < 1) continue;
    dataRows.push({ idx: i, id: cells[0] });
  }
  const existing = dataRows.find((r) => r.id === experience.id);
  if (existing) {
    if (!overwrite) return { newLines: sectionLines, appended: false, duplicateId: existing.id };
    const newLines = [...sectionLines];
    newLines[existing.idx] = newRow;
    return { newLines, appended: true };
  }
  // 追加新行:在最后数据行之后,若无数据行则在 separator 之后
  const insertAt = dataRows.length > 0 ? dataRows[dataRows.length - 1].idx + 1 : separatorIdx + 1;
  return {
    newLines: [...sectionLines.slice(0, insertAt), newRow, ...sectionLines.slice(insertAt)],
    appended: true,
  };
}

export async function ruleAppender(input: RuleAppenderInput): Promise<RuleAppenderResult> {
  const { handoffPath, experience, overwrite = false } = input.args;

  // 校验 id
  const idError = validateId(experience.id);
  if (idError) {
    return {
      intent: "pass",
      data: { appended: false, targetPath: handoffPath, appendedId: experience.id },
      metadata: { parseError: idError },
    };
  }

  // 读 HANDOFF.md(不存在 → 创建空模板)
  let content: string;
  try {
    content = await fs.readFile(handoffPath, "utf-8");
  } catch {
    const dir = dirname(handoffPath);
    try {
      if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });
    } catch (mkdirErr) {
      return {
        intent: "pass",
        data: { appended: false, targetPath: handoffPath, appendedId: experience.id },
        metadata: { writeError: mkdirErr instanceof Error ? mkdirErr.message : String(mkdirErr) },
      };
    }
    content = EMPTY_HANDOFF_TEMPLATE;
  }

  // 定位 section(不存在 → 文件末尾追加完整 section)
  const parsed = locateSection(content);
  let newContent: string;
  let appended: boolean;
  let duplicateId: string | undefined;

  if (!parsed.found) {
    const sectionBlock = [
      SECTION_HEADER, "", SECTION_NOTE, "", TABLE_HEADER, TABLE_SEPARATOR,
      makeRow(experience.id, experience.content, experience.source, new Date().toISOString()),
    ].join("\n");
    const prefix = content.endsWith("\n") ? content : content + "\n";
    newContent = `${prefix}\n${sectionBlock}\n`;
    appended = true;
  } else {
    const result = processSection(parsed.sectionLines, experience, overwrite);
    appended = result.appended;
    duplicateId = result.duplicateId;
    newContent = `${parsed.before}${result.newLines.join("\n")}${parsed.after}`;
  }

  if (!appended) {
    return {
      intent: "pass",
      data: { appended: false, targetPath: handoffPath, appendedId: experience.id, duplicateId },
    };
  }

  // 写回(占用时重试 3 次)
  const writeError = await writeFileWithRetry(handoffPath, newContent);
  if (writeError) {
    return {
      intent: "pass",
      data: { appended: false, targetPath: handoffPath, appendedId: experience.id },
      metadata: { writeError },
    };
  }
  return {
    intent: "pass",
    data: { appended: true, targetPath: handoffPath, appendedId: experience.id },
  };
}
