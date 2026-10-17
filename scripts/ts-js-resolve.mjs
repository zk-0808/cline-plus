/**
 * ts-js-resolve.mjs — 让"用 .js 说明符写的 .ts 源码"能被 Node 直接跑起来
 *
 * 背景：`.governance/plugin/**` 与部分 capability 用 TS 写，但 import 说明符写的是 `.js`
 * （这是 tsc 的标准写法：源码写 `.js`，编译产物才对得上）。Node 的原生类型剥离只擦除类型，
 * **不会**把 `.js` 改写成 `.ts`，所以这些文件在没有构建产物时一加载就 ERR_MODULE_NOT_FOUND
 * —— 仓库自带的 `verify-governance.ts` 因此长期"文档写了怎么跑、实际跑不起来"。
 *
 * 这个 loader 只做一件事：解析失败时，把 `./x.js` 换成 `./x.ts` 再试一次。
 * 不做别的，不改变语义，不注入全局。
 *
 * 两种用法：
 *   1) 前置加载（入口本身就是 .ts 时）
 *      node --import ./scripts/ts-js-resolve.mjs .governance/plugin/verify-governance.ts
 *   2) 进程内按需开启（入口自己决定何时加载 .ts）
 *      import { ensureTsLoader } from './ts-js-resolve.mjs'; ensureTsLoader();
 *
 * 作为 `--import` 加载时，模块求值末尾会自动调用 ensureTsLoader()。
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

/** 只有"相对路径 + .js"才可能改写；包名、node: 前缀、非 .js 一律不动 */
export function rewriteSpecifier(spec) {
  if (typeof spec !== 'string') return spec;
  if (!spec.startsWith('.') && !spec.startsWith('file:')) return spec;
  if (!spec.endsWith('.js')) return spec;
  return `${spec.slice(0, -3)}.ts`;
}

const HOOK_SOURCE = `
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('file:');
    if (!relative || !specifier.endsWith('.js')) throw err;
    try {
      return await next(specifier.slice(0, -3) + '.ts', context);
    } catch {
      throw err;
    }
  }
}
`;

/**
 * 在当前进程注册解析钩子。动态 import 之前调用即可，调用方不必再加 --import。
 * 重复调用是安全的：Node 允许多次 register，钩子叠加但结果一致。
 */
export function ensureTsLoader() {
  register(
    `data:text/javascript,${encodeURIComponent(HOOK_SOURCE)}`,
    pathToFileURL(import.meta.filename).href,
  );
}

// 作为 --import 使用时，模块一求值就生效
ensureTsLoader();
