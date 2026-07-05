// config-loader.ts — 读取并合并 hooks/config.json 与默认配置

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG, type HooksConfig } from "./types.js";

/** 深合并两个配置对象 (b 覆盖 a) */
function deepMerge<T>(a: T, b: Partial<T>): T {
  if (typeof a !== "object" || a === null) return (b ?? a) as T;
  if (typeof b !== "object" || b === null) return (b ?? a) as T;
  if (Array.isArray(a)) return (b as unknown as T) ?? a;

  const result: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b as object)]);
  for (const key of keys) {
    const aVal = (a as Record<string, unknown>)[key];
    const bVal = (b as Record<string, unknown>)[key];
    if (aVal !== undefined && bVal === undefined) {
      result[key] = aVal;
    } else if (aVal === undefined && bVal !== undefined) {
      result[key] = bVal;
    } else if (typeof aVal === "object" && typeof bVal === "object" && !Array.isArray(aVal)) {
      result[key] = deepMerge(aVal, bVal as Record<string, unknown>);
    } else {
      result[key] = bVal ?? aVal;
    }
  }
  return result as T;
}

/** 加载配置:读取 config.json,深合并到默认配置 */
export function loadConfig(workspacePath: string): HooksConfig {
  const configPath = join(workspacePath, ".governance", "hooks", "config.json");

  if (!existsSync(configPath)) {
    console.log("[governance] config.json not found, using defaults");
    return DEFAULT_CONFIG;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const userConfig = JSON.parse(raw) as Partial<HooksConfig>;
    return deepMerge(DEFAULT_CONFIG, userConfig);
  } catch (err) {
    console.warn(
      `[governance] config.json parse failed, using defaults: ${err instanceof Error ? err.message : String(err)}`
    );
    return DEFAULT_CONFIG;
  }
}
