#!/usr/bin/env node
/**
 * run.mjs — 一次跑完全部测试
 *
 *   node governance-console/test/run.mjs            全部
 *   node governance-console/test/run.mjs validate   只跑文件名含 "validate" 的
 *
 * 退出码 0 = 全绿；1 = 有用例失败。
 */
import './validate.test.mjs';
import './batch.test.mjs';
import './contract.test.mjs';

import { runAll } from './harness.mjs';

const okAll = await runAll();
process.exit(okAll ? 0 : 1);
