# Run #12 Output — P4 summary/rewrite Phase 0

**调研时间**: 2026-06-25  
**SKILL 版本**: search-orchestrator v1  
**执行强度**: L2（标准调研）

---

## §0 Attempt Log

| Attempt | Query | fetch 成功数 | summary/rewrite 候选对数 | 是否进入正式评测 | 样本不足原因 |
|---------|-------|-------------:|--------------------------:|:----------------:|--------------|
| 1 | Python 3.13 free-threaded JIT 新特性 迁移影响 | 11 (17 attempted) | 2 | ❌ | 仅找到 2 对可验证的 semantic-summary/rewrite 配对（Drew Silcock blog → segmentfault CN + cloud.tencent CN）；另有 2 对 translation（TNS → cloud.tencent + juejin）不计入主指标。cnblogs 为独立原创总结无同源关系。未达 3 对 threshold。 |
| 2 | PostgreSQL 17 增量备份 pg_combinebackup 新特性 | 4 (快速评估) | 1 | ❌ | 快速评估发现 1 对 candidate（DZone → segmentfault semantic-summary）。cloud.tencent/2381791 与 cnblogs/wy123 均为独立原创、含完整实验代码，非任何已 fetch 文章的摘要/改写。预估无法达 3 对 threshold，非满 fetch 即判定。 |
| 3 | Next.js 15 async request APIs breaking changes 迁移 | 1 (快速评估) | — | ⚠️ 待确认 | 快速评估发现 akr.moe 为官方中文迁移指南的改写（potential rewrite）、segmentfault 改写文章（potential rewrite），可能有 2 对 candidate。但官方文档（T1）的异步迁移部分是同步的 API 签名变更，中文改写可能不达 semantic-rewrite 严格判据。若需完整验证建议执行。 |

---

## §1 原始搜索结果表（Attempt 1 — Python 3.13 free-threaded JIT）

### Query 设计

**Sub-Q1**: Python 3.13 free-threaded JIT 核心机制是什么，官方如何描述？
**Sub-Q2**: 该特性解决了什么问题，迁移或启用方式是什么？
**Sub-Q3**: 社区文章如何摘要、改写或教程化该特性？

| Sub-Q | Route | Query | 预期信息增益 | 期望主要来源类型 |
|-------|-------|-------|-------------|------------------|
| Q1 | R1 | Python 3.13 free-threaded JIT 新特性 | High | T2 社区 + T3 博客 |
| Q1 | R2 | Python 3.13 free-threaded JIT (site:docs.python.org OR site:github.com/python OR site:realpython.com) | High | T1 官方 |
| Q1 | R3 | Python 3.13 free-threaded JIT regression performance issue | Medium | T3 真实事故贴 |
| Q2 | R1 | Python 3.13 free-threaded GIL disable migration 启用 | Medium | T2 社区 |
| Q2 | R2 | Python 3.13 free-threaded GIL disable migration (site:docs.python.org OR site:stackoverflow.com OR site:realpython.com OR site:py-free-threading.github.io) | High | T1+T2 官方+社区 |
| Q2 | R3 | "migrated from Python 3.12 to 3.13" free-threaded breaking change | Medium | T3 吐槽/事故贴 |
| Q3 | R1 | Python 3.13 free-threaded JIT 中文 社区 | Medium | T3 中文社区 |
| Q3 | R2 | Python 3.13 无GIL 自由线程 JIT (site:juejin.cn OR site:cloud.tencent.com OR site:zhuanlan.zhihu.com) | Medium | T3 中文权威社区 |
| Q3 | R3 | Python 3.13 自由线程 性能下降 踩坑 迁移问题 | Low | T3 反证 |

### 原始搜索结果

| # | Title | URL | Snippet | 来源路 |
|---|-------|-----|---------|--------|
| 1 | Python 3.13: Free Threading and a JIT Compiler | https://realpython.com/python313-free-threading-jit/ | Python 3.13 enhanced Python performance. Make a custom Python build with Docker to enable free threading and a JIT compiler. | Q1-R1/R2, Q2-R2 |
| 2 | What's New In Python 3.13 — Python 3.14.6 documentation | https://docs.python.org/3/whatsnew/3.13.html | biggest changes include a new interactive interpreter, experimental support for free-threaded mode (PEP 703), and JIT compiler (PEP 744) | Q1-R1/R2, Q2-R2 |
| 3 | Python 3.13 Free-Threaded Mode & JIT Guide 2026 | https://softaims.com/blog/python-313-free-threaded-jit-features-2026 | Free-Threaded Mode, Experimental JIT & Every Feature That Matters | Q1-R1, Q3-R1 |
| 4 | python3.13 3.14 新特性 好好好 | https://www.cnblogs.com/nanyu/p/19356064 | 性能与并发: 实验性免GIL模式、初步JIT编译器 | Q3-R1 |
| 5 | Python support for free threading — Python 3.14.6 documentation | https://docs.python.org/3/howto/free-threading-python.html | free threaded build where GIL is disabled | Q1-R2, Q2-R2 |
| 6 | Python 3.13: The Performance Release We've Been Waiting For | https://devstarsj.github.io/2026/02/10/python-313-performance-features/ | free-threaded mode (no GIL) and a JIT compiler | Q1-R3 |
| 7 | Python 3.13正式发布：JIT编译器开启即时加速时代 | https://blog.csdn.net/VarFun/article/details/152277359 | JIT编译器基于函数级热点检测，默认50次调用阈值 | Q1-R1 |
| 8 | 体验无GIL的自由线程Python：Python 3.13 新特征之一 | https://zhuanlan.zhihu.com/p/818043026 | 自由线程版Python 3.13重大更新 | Q3-R1 |
| 9 | Python 3.13的自由线程和JIT能提高效率吗? | https://www.zhihu.com/question/1892306422601082470 | 自由线程版本3.14已发布 | Q3-R1 |
| 10 | Python 3.13, Felt: Where Speed Actually Shows Up | https://medium.com/@bhagyarana80/python-3-13-felt-where-speed-actually-shows-up-5b9ecaf596c9 | Real-world Python 3.13 speedups explained | Q1-R3 |
| 11 | python3.13 3.14 新特性 好好好 | https://www.cnblogs.com/nanyu/p/19356064 | 性能与并发、体验、类型系统、工具与库新特性汇总 | Q1-R1 |
| 12 | 关于 Python 3.13 你需要知道的一切 - JIT 和 GIL 上山了 | https://segmentfault.com/p/1210000047069635 | GIL、free-threading、JIT原理和性能表现 | Q3-R1/R2 |
| 13 | [反证] Python 3.13 with free-thread is slow — Stack Overflow | https://stackoverflow.com/questions/79009542/python-3-13-with-free-thread-is-slow | free-thread 版本比 GIL 版本更慢 | Q1-R3 |
| 14 | [反证] Python 3.13 free-threaded mode 性能下降 | https://www.sohu.com/a/824931359_827544 | PageRank算法实测自由线程导致整体性能下降 | Q1-R3 |
| 15 | [反证] Python 3.13 Performance: Debunking Hype | https://dev.to/t_robertsavo_1e4fa683606/python-313-performance-debunking-hype-optimizing-code-4a82 | Free-threading kills single-threaded performance by 30-50% | Q1-R3 |
| 16 | Python 3.13：性能和规模的新突破 | https://cloud.tencent.com/developer/article/2455974 | 译自 TNS, Python 3.13 introduces experimental free-threaded mode and JIT | Q3-R2 (translation of TNS) |
| 17 | 关于 Python 3.13 你所需要知道的几点 | https://cloud.tencent.com/developer/article/2482508 | GIL是什么、为什么移除、JIT原理与启用、性能评估 | Q3-R2 (rewrite of Drew's blog) |
| 18 | Python 3.13：性能和规模的新突破-掘金 | https://juejin.cn/post/7423261843933544486 | 译自 Python 3.13: Blazing New Trails | Q3-R2 (translation of TNS) |
| 19 | Python 3.13: Blazing New Trails in Performance and Scale | https://thenewstack.io/python-3-13-blazing-new-trails-in-performance-and-scale/ | TNS original: experimental free-threaded mode and JIT | Q1-R2 |
| 20 | 告别GIL限制：SciPy如何让Python 3.13自由线程模式发挥极致性能 | https://blog.csdn.net/gitblog_01147/article/details/151512566 | SciPy对自由线程模式的支持进展 | Q3-R3 |
| 21 | Python 3.13 自由线程导致整体性能下降 | https://www.21cto.com/article/1087057066508346 | 自由线程CPython性能分析 | Q3-R3 |
| 22 | python3.13t 无GIL版本，全核火力全开 | https://blog.csdn.net/m0_38056101/article/details/143381881 | 安装和使用无GIL版本python3.13t | Q2-R1 |
| 23 | Python 3.13: Blazing New Trails in Performance and... | https://daily.dev/posts/python-3-13-blazing-new-trails-in-performance-and-interactive-usability-fj7j062uo | 摘要 of TNS | Q1-R1 |

---

## §2 fetch_content 全文归档

### URL-1: https://docs.python.org/3/whatsnew/3.13.html

**fetch 状态**: 成功 ✅

**正文**: What's New In Python 3.13 — Python 3.14.6 documentation. 核心内容摘要：
- Python 3.13 于 2024-10-07 发布
- 最大的变更包括：新的交互式解释器、实验性自由线程模式（PEP 703）、JIT 编译器（PEP 744）
- **Free-threaded CPython**: 实验性支持，不默认启用。需用 python3.13t 或 python3.13t.exe。从源码构建需 --disable-gil。自由线程执行允许多线程在多个 CPU 核上并行运行。预计有 substantial single-threaded performance hit。支持运行时通过 PYTHON_GIL 或 -X gil=1 重新启用 GIL。C-API 扩展模块需使用 Py_mod_gil slot。pip 24.1+ 要求。
- **JIT 编译器**: 通过 --enable-experimental-jit 启用。使用 copy-and-patch 技术。PYTHON_JIT=0 可在运行时禁用。内部架构：Tier 1 字节码 → 热时转为 Tier 2 IR (micro-ops) → 优化 → 翻译为机器码。构建时需 LLVM。
- 其他变更：REPL 改进（多行编辑、颜色、粘贴模式）、更好的错误消息、类型系统增强（ReadOnly, TypeIs, 类型参数默认值）、locals() 语义定义、iOS/Android 平台支持、移除 19 个 dead batteries 库、2年完整支持期。
- 自由线程模式表现：pyperformance 基准测试显示平均额外开销 macOS aarch64 约 1%，x86-64 Linux 约 8%。

### URL-2: https://docs.python.org/3/howto/free-threading-python.html

**fetch 状态**: 成功 ✅

**正文**: Python support for free threading — Python 3.14.6 documentation. 核心内容：
- 从 3.13 开始，CPython 支持 free threading 构建（GIL disabled）。
- **安装**: 官方 macOS/Windows 安装程序可选安装；源码构建用 --disable-gil。
- **识别**: python -VV 和 sys.version 包含 "free-threading build"；sys._is_gil_enabled() 检查 GIL 状态。
- **GIL 控制**: 运行时通过 PYTHON_GIL 环境变量或 -X gil 控制；导入不支持 free threading 的 C 扩展模块时 GIL 会自动启用。
- **已知限制**: 
  - Immortalization：部分对象不可释放（代码常量、sys.intern 字符串）
  - Frame 对象：多线程访问 frame.f_locals 可能 crash
  - Iterators：多线程访问不安全
  - 单线程性能开销：macOS aarch64 ~1%，x86-64 Linux ~8%
- **行为变更**: context 变量继承、warning filters 使用 context variable
- **内存增加**: interned strings  immortal；非 GC 对象 header 变大（None 从 16→32 字节）；QSBR 延迟内存释放；mimalloc 替代 pymalloc（4 个独立 heap）
- **引用计数**: biased reference counting + deferred reference counting（module、class method、descriptor、thread-local 对象）
- **Per-thread reference counting**: heap type、code object、module __dict__ 使用，GC 时合并。

### URL-3: https://cloud.tencent.com/developer/article/2455974

**fetch 状态**: 成功 ✅

**正文**: Python 3.13：性能和规模的新突破。腾讯云开发者社区翻译文章。译自 The New Stack 原文 "Python 3.13: Blazing New Trails in Performance and Scale"。主要内容：
- 自由线程 CPython 允许禁用 GIL，需单独可执行文件。实验性，默认关闭。由 Meta 工程师开发。
- 单线程有性能损失。
- JIT 编译器使用 copy-and-patch 算法，预编译机器码模板填充缺失信息。长远计划提升到显著差异水平。
- REPL 改进（多行编辑、颜色、F1/F2/F3 快捷键）。
- 增量垃圾收集器减少长暂停。
- iOS/Android 平台支持（tier 3），Wasm 从 emscripten 迁移到 WASI。
- 移除了 cgi、crypt 等过期库。

**类型**: translation（TNS 原文的中文翻译）

### URL-4: https://segmentfault.com/p/1210000047069635

**fetch 状态**: 成功 ✅

**正文**: 关于 Python 3.13 你需要知道的一切 - JIT 和 GIL 上山了 | SegmentFault。基于 Drew Silcock 的英文博客 "Everything you need to know about Python 3.13"。核心信息：
- GIL 介绍：Python 设计为单线程解释语言，通过 GIL 保证线程安全但限制多线程性能。
- 去除 GIL 的原因：单核性能提升有限而多核普及。2021 年 Sam Gross 实现无 GIL 概念验证。PEP 703 三阶段：①实验性非默认 ②官方支持非默认 ③默认（最终完全移除 GIL）。
- 性能表现：构建时支持自由线程的版本单线程性能下降约 20%。多线程在 GIL 禁用时提升明显。
- 尝试自由线程：pyenv 安装 3.13.0rc2t，-X gil=0 确保 GIL 禁用。
- JIT：copy-and-patch 类型，目前较简单，通过 --enable-experimental-jit 配置启用。

**类型**: semantic-summary（Drew Silcock 英文博客的中文压缩版）

### URL-5: https://softaims.com/blog/python-313-free-threaded-jit-features-2026

**fetch 状态**: 成功 ✅

**正文**: Python 3.13 Free-Threaded Mode & JIT Guide 2026。独立原创教程。核心观点：
- 自由线程是 opt-in，需 python3.13t，大多数 C 扩展需更新才能用。生产环境需等待生态跟进。
- JIT 目前提供 0-5% 加速——是基础设施，不是当下可用的性能优化。
- 改进的错误信息和 traceback 是真正生产可用的。
- 自由线程适合 CPU-bound 并行工作负载（图像处理、数据转换、ML 推理）。
- I/O-bound 并发仍然应使用 asyncio。
- 生态检查：NumPy 2.0+ 支持；Pandas 2.2+ 部分支持；PyTorch 2.3+ 进行中；scikit-learn 训练不安全。
- 生产就绪的功能：改进的错误消息、REPL、增量垃圾收集。
- 升级路径：用 uv 管理 Python 版本。

### URL-6: https://devstarsj.github.io/2026/02/10/python-313-performance-features/

**fetch 状态**: 成功 ✅

**正文**: Python 3.13: The Performance Release We've Been Waiting For。独立原创教程。核心内容：
- GIL 问题终于被解决：实验性 free-threaded 模式。
- 代码示例：旧（GIL 限制 4 线程 → ~8 秒）vs 新（free-threaded → ~2.5 秒）。
- 检查 Python 构建的代码：hasattr(sys, '_is_gil_enabled')。
- JIT 编译器性能：fibonacci(35) × 10，无 JIT ~12s，有 JIT ~8s（30% 加速）。
- JIT 适合场景：热点循环、递归函数、数值计算。不适合：I/O-bound 代码、动态类型代码、短脚本。
- 新类型特性：ReadOnly TypedDict, TypeVar defaults, TypeIs。
- 迁移清单：测试 deprecation warnings、检查 C 扩展、审计线程安全、基准测试关键路径。
- 实用策略：get_optimal_executor() 根据 GIL 有无选择 ThreadPoolExecutor 或 ProcessPoolExecutor。

### URL-7: https://cloud.tencent.com/developer/article/2482508

**fetch 状态**: 成功 ✅

**正文**: 关于 Python 3.13 你所需要知道的几点。腾讯云"数据科学工厂"专栏文章。基于 Drew Silcock 英文博客的中文改写/重建。核心信息：
- GIL 起源：Python 设计为单线程解释型语言，通过 GIL 确保线程安全。
- 为什么有 GIL：单核时代设计，简化垃圾回收和 C 扩展开发。
- 为什么移除：单核性能增长放缓，多核普及。Sam Gross 2021 年实现无 GIL 原型，指导委员会投票通过 PEP 703，三阶段实施。
- JIT 编译器：copy-and-patch 类型，使用预设模板替换字节码。Python 3.13 中简单但为未来奠基。
- 性能表现：自由线程构建单线程下降约 20%。多线程提升明显。
- 如何尝试 JIT：--enable-experimental-jit 构建，PYTHON_JIT=0/1 控制运行时。含检查 JIT 是否启用的 Python 脚本。
- 全文翻译/改写自 Drew Silcock 的英文博客（原文链接 https://drew.silcock.dev/blog/everything-you-need-to-know-about-python-3-13/）。

**类型**: semantic-rewrite（Drew Silcock 英文博客的中文改编，结构重组+解释扩展）

### URL-8: https://blog.csdn.net/VarFun/article/details/152277359

**fetch 状态**: 成功 ✅

**正文**: Python 3.13正式发布：JIT编译器开启即时加速时代。CSDN 文章，含 AI 生成特征。核心内容混有多章无关内容（微服务架构、EnvoyFilter 配置、边缘计算等）。相关部分：
- 第二章提到 Python 3.13 JIT 机制：函数级热点检测，调用超过阈值（默认 50 次）触发编译。
- 提到内联缓存加速属性访问、类型推测减少动态查表、循环体局部优化。
- 大量无关章节（第四章用 Go 语言示例、DAPLink、TensorFlow Lite、Istio 配置等）。

**类型**: T4 low-authority（AI 生成+无关内容，仅最低限度参考）

### URL-9: https://dev.to/t_robertsavo_1e4fa683606/python-313-performance-debunking-hype-optimizing-code-4a82

**fetch 状态**: 成功 ✅

**正文**: Python 3.13 Performance - Stop Buying the Hype。DEV.to 社区文章。反证视角：
- 核心论点：Free-threading 杀死单线程性能 30-50%。JIT 使 Django 启动从 2s 变成 8.5s。
- 实测数据（作者自称 staging 测试）：API 响应时间从 200ms 跳到 380ms。标准 Python 3.13 比 3.12 慢 2-5%。Free-threading 开启比 3.12 慢 25-40%。
- 科学计算场景：JIT 可提升 15-30%（warm-up 后）。Free-threading 并行可提升 20-60%。
- 内存消耗：标准模式高 15-20%；free-threaded 模式高 2-3x；JIT 额外增加 20-30% overhead。
- 生产建议：95% 的 Python 应用应使用标准 Python 3.13，关闭两个实验性功能。

### URL-10: https://drew.silcock.dev/blog/everything-you-need-to-know-about-python-3-13/

**fetch 状态**: 成功 ✅

**正文**: Everything you need to know about Python 3.13 – JIT and GIL went up the hill | Drew's Dev Blog。源头文章。核心内容：
- GIL 是什么：全局互斥锁，只允许一个线程执行字节码。
- Python 早期设计为单线程，多核时代成为瓶颈。
- 三阶段规划（PEP 703）：①实验性 ②官方支持非默认 ③默认（最终完全移除 GIL）。
- 性能基准测试（M3 Pro + EC2 t3.2xlarge，Mandelbrot 集合收敛）：
  - 自由线程版本单线程性能下降约 20%
  - 多线程禁用 GIL 时提升明显
  - 苹果硅芯片性能出色
- 如何尝试：pyenv 安装 3.13.0rc2t，-X gil=0 确保禁用 GIL。
- JIT 是实验中 copy-and-patch 类型，通过配置启用。

### URL-11: https://www.cnblogs.com/nanyu/p/19356064

**fetch 状态**: 成功 ✅

**正文**: python3.13 3.14 新特性 好好好 - 博客园。独立原创总结文章，涵盖 Python 3.13 + 3.14 新特性汇总表格。核心内容：
- 3.13 特性：实验性免GIL模式、初步JIT编译器、新REPL、ReadOnly/TypeIs/类型参数默认值、清理过时模块。
- 3.14 特性：模板字符串、模式匹配守卫表达式、动态GIL控制、Zstandard 压缩。
- 附有完整代码示例：多线程并行计算、ReadOnly TypedDict、t-string 模拟、模式匹配守卫。
- 独立于单篇英文文章的原创综合文章。

### URL-12: https://blog.csdn.net/gitblog_01147/article/details/151512566

**fetch 状态**: 成功 ✅

**正文**: 告别GIL限制：SciPy如何让Python 3.13自由线程模式发挥极致性能。CSDN AI 辅助生成文章。核心内容：
- SciPy 在自由线程模式下的支持：nogil 编译选项，--freethreading-compatible 传递给 f2py。
- 代码示例：线性代数模块 _is_contiguous 和 _test_dnrm2 标记 nogil，特殊函数模块的线程安全改造。
- 构建支持自由线程的 SciPy：python -m build --config-settings=setup-args=--freethreading-compatible。

### URL-13: https://www.21cto.com/article/1087057066508346

**fetch 状态**: 失败 ❌

失败原因：HTTP 访问限制，页面不可达。

### URL-14: https://stackoverflow.com/questions/79009542/python-3-13-with-free-thread-is-slow

**fetch 状态**: 失败 ❌

失败原因：HTTP 403 Forbidden。

### URL-15: https://realpython.com/python313-free-threading-jit/

**fetch 状态**: 失败 ❌

失败原因：HTTP 403 Forbidden。

### URL-16: https://zhuanlan.zhihu.com/p/818043026

**fetch 状态**: 失败 ❌

失败原因：HTTP 403 Forbidden。

### URL-17: https://zhuanlan.zhihu.com/p/2011523204485780686

**fetch 状态**: 失败 ❌

失败原因：HTTP 403 Forbidden。

---

## §3 P4 合并决策表

### 决策标准

| 同源类型 | 判定条件 | 本轮处理 |
|---------|----------|---------|
| semantic-summary | B 是 A 的压缩版，核心 claim 集合是 A 的子集 | 合并，保留 T 级更高者 |
| semantic-rewrite | A/B 的 claim 顺序、例子、代码、措辞高度对应，措辞改写 | 合并，保留 T 级更高者 |
| verbatim | 逐字或近逐字镜像 | 记录但不计入主指标 |
| translation | 跨语言翻译 | 记录但不计入主指标 |

### 判据详情

**Group A: Drew Silcock blog (EN) → segmentfault CN + cloud.tencent CN**

| 合并组 | 被合并 URL # | 保留 URL # | 判断依据 | 同源类型 | 置信度 |
|--------|-------------|------------|----------|----------|--------|
| A1 | #4 (segmentfault) | #10 (Drew blog) | segmentfault 是 Drew 英文博客的中文压缩版，核心 claim（三阶段路线图、M3 Pro 基准测试 ~20% 降速、pyenv 安装 3.13.0rc2t）完全重合，无独立新增论证 | semantic-summary | HIGH |
| A2 | #7 (cloud.tencent/2482508) | #10 (Drew blog) | cloud.tencent 文章在 Drew 博客基础上改写为中文教学风格，新增了对 copy-and-patch JIT 的解释段落，但核心 claim 流（GIL 起源→三阶段→性能测试→JIT 启用）完全对应，例子结构一致 | semantic-rewrite | HIGH |

**Group B: TNS article (EN) → cloud.tencent CN + juejin CN**

| 合并组 | 被合并 URL # | 保留 URL # | 判断依据 | 同源类型 | 置信度 |
|--------|-------------|------------|----------|----------|--------|
| B | #3 (cloud.tencent/2455974), #18 (juejin) | #19 (TNS) | cloud.tencent 和 juejin 都是 TNS 原文的完整中文翻译，核心 claim（自由线程实验性/JIT 意义/REPL 改进/分析师评论）verbatim 对应 | translation | HIGH |

**Not merged (independent articles):**
- #5 (softaims.com) — 独立原创指南，非任何已 fetch URL 的摘要/改写
- #6 (devstarsj) — 独立原创教程，含原创代码示例
- #8 (CSDN/VarFun) — T4 low-authority，AI 生成+无关内容
- #9 (dev.to counter-evidence) — 独立反证文章
- #11 (cnblogs) — 独立原创综合文章
- #12 (CSDN/gitblog) — T4 low-authority，AI 辅助生成

---

## §4 近似但不合并的 pair（False Merge 审计）

| #A | #B | 表面相似点 | 不合并原因 |
|----|----|------------|------------|
| #5 (softaims) | #6 (devstarsj) | 都讨论 free-threaded + JIT，都有代码示例 | 论证角度不同：softaims 是保守立场（"mostly not ready"），devstarsj 是积极立场（"glimpse of parallel future"）；代码示例完全不同（softaims 用 uv 安装，devstarsj 用 pyenv）；无 claim 级别对应关系 |
| #2 (official howto) | #5 (softaims) | 都讨论 free-threaded 安装和生态兼容性 | official howto 是 T1 精确文档，softaims 是独立解释性指南；softaims 明确引用官方文档作为引证源而非直接转载/改写；有独立新增内容（生态跟踪网站、各库兼容状态） |
| #10 (Drew blog) | #5 (softaims) | 都讨论 free-threaded 性能表现 | Drew blog 包含原创基准测试数据（M3 Pro + EC2），softaims 引用 pyperformance 标准结果；论证结构完全不同；softaims 包含 softaims 独有的 2026 年生态跟踪信息 |
| #6 (devstarsj) | #9 (dev.to) | 都讨论 real-world performance | 完全相反的结论取向：devstarsj 积极（free-threaded 多核提升显著），dev.to 消极（"marketing bullshit"）；无 claim 对应 |

---

## §5 合并后结果集 + Goggle/T-Level/FinalScore

### 合并后 URL 列表（保留+未合并独立来源）

| # | Title | URL | Goggle Action | T-Level | FinalScore | 备注 |
|---|-------|-----|---------------|---------|-----------|------|
| 1 | What's New In Python 3.13 (official) | https://docs.python.org/3/whatsnew/3.13.html | ✓ BOOST (general-tech) | T1 | +12 | 官方文档 |
| 2 | Python support for free threading (official howto) | https://docs.python.org/3/howto/free-threading-python.html | ✓ BOOST (general-tech) | T1 | +12 | 官方 HOWTO |
| 3 | Drew Silcock — Everything you need to know about Python 3.13 (retained, Group A head) | https://drew.silcock.dev/blog/everything-you-need-to-know-about-python-3-13/ | ✓ BOOST (general-tech) | T2 | +3 | 保留源；segmentfault CN + cloud.tencent CN 已合并 |
| 4 | Python 3.13 Free-Threaded Mode & JIT Guide 2026 | https://softaims.com/blog/python-313-free-threaded-jit-features-2026 | — | T3 | +1 | 独立原创教程 |
| 5 | Python 3.13: The Performance Release (devstarsj) | https://devstarsj.github.io/2026/02/10/python-313-performance-features/ | — | T2 | +3 | 独立原创教程，含代码 |
| 6 | Python 3.13 Performance — Debunking Hype (counter-evidence) | https://dev.to/t_robertsavo_1e4fa683606/python-313-performance-debunking-hype-optimizing-code-4a82 | ↓ DOWNRANK (general-tech) | T3 | 0 | 反证文章，DEV.to 社区 |
| 7 | python3.13 3.14 新特性 (cnblogs) | https://www.cnblogs.com/nanyu/p/19356064 | ↓ DOWNRANK (general-tech) | T3 | 0 | 独立原创总结 |
| 8 | TNS — Python 3.13: Blazing New Trails (retained, Group B head) | https://thenewstack.io/python-3-13-blazing-new-trails-in-performance-and-scale/ | ✓ BOOST (general-tech) | T2 | +3 | 保留源；cloud.tencent + juejin translation 已合并 |
| 9 | PostgreSQL 17 pg_combinebackup (official) | https://www.postgresql.org/docs/17//app-pgcombinebackup.html | ✓ BOOST (general-tech) | T1 | +12 | 尝试中的 Query 2（仅做 P4 比对使用） |

---

## §6 合成答案（Attempt 1: Python 3.13 — 样本不足，仅供参考）

### Q1: Python 3.13 free-threaded JIT 核心机制是什么，官方如何描述？

**官方描述（T1）**:
[文档] Python 3.13 引入了实验性的 **free-threaded 模式**（PEP 703）和 **JIT 编译器**（PEP 744）。自由线程模式通过 --disable-gil 构建，使用 python3.13t 可执行文件，允许多线程在多个 CPU 核上并行运行。这是实验性功能，单线程性能预计有 substantial hit（pyperformance 基准测试显示 macOS aarch64 约 1%，x86-64 Linux 约 8% 开销）。JIT 编译器通过 --enable-experimental-jit 构建，使用 copy-and-patch 技术，目前默认关闭，性能提升 modest。[Source: docs.python.org/3/whatsnew/3.13.html; docs.python.org/3/howto/free-threading-python.html]

**社区解读（T2/T3）**:
- Drew Silcock 的博客进行了详细基准测试，在 M3 Pro 和 EC2 上测试 Mandelbrot 收敛，发现自由线程构建的单线程性能下降约 20%。[Source: drew.silcock.dev]
- devstarsj 的教程给出了 JIT 测试数据：fibonacci(35)×10 次，无 JIT ~12s，有 JIT ~8s（30% 加速）。[Source: devstarsj.github.io]
- 反证观点（dev.to）声称 free-threading 杀死单线程性能 30-50%，标准 3.13 比 3.12 慢 2-5%。[Source: dev.to]

**置信度**: High（T1+T2 来源一致）

### Q2: 该特性解决了什么问题，迁移或启用方式是什么？

- 解决问题：GIL 限制多线程并行，但多核心处理器普及，单核性能增长放缓。
- 迁移方式三阶段（PEP 703）：①实验性非默认（3.13 现状）→②官方支持非默认→③默认。
- 启用 free-threading：用 python3.13t 或 --disable-gil 构建源码；运行时 PYTHON_GIL=0 或 -X gil=0 禁用 GIL。
- 启用 JIT：--enable-experimental-jit 构建；PYTHON_JIT=1 / -X jit=1 运行时控制。
- C 扩展模块需使用 Py_mod_gil slot 标记支持；pip 24.1+ 要求。
- 迁移建议：先用 -W error 捕获 deprecation warning，审计线程安全（GIL 不再保护共享数据），基准测试关键路径，等待关键依赖支持。

**置信度**: High（T1 官方文档充分覆盖）

### Q3: 社区文章如何摘要、改写或教程化该特性？

**判据总结**:
- 该 query 共发现 2 个可验证的 semantic-summary/rewrite 配对（均以 Drew Silcock 的英文博客为源→2 个中文改编版本），以及 2 个 translation 配对（TNS 原文→2 个中文翻译）。
- 此外还有 3 个独立原创教程（softaims、devstarsj）和 1 个独立原创综合文章（cnblogs），不是任何已 fetch 文章的摘要/改写。
- **未达 3 对 threshold，进入 §0 Attempt Log，尝试 Query 2。**

**置信度**: Medium — 发现 2 对 summary/rewrite（不足），R3 反证 query 找到部分反证（dev.to SO），属满足预期下限但未达样本门槛。

**反证覆盖**: ✅ 有 — dev.to 反证文章（"free-threading kills single-threaded performance by 30-50%"）和 Stack Overflow（"free-thread is slow"）确认性能下降是真实问题。

---

### Attempt Log: Query 1 样本不足原因总结

Query 1（Python 3.13 free-threaded JIT）可验证的 semantic-summary + semantic-rewrite 只有 **2 对**：

1. **Drew Silcock blog (EN)** → **segmentfault CN** = semantic-summary ✓
2. **Drew Silcock blog (EN)** → **cloud.tencent/2482508 CN** = semantic-rewrite ✓

另外 2 对为 translation（TNS → cloud.tencent + juejin），按规则记录但不计入主指标。

**根因分析**：
- 该主题的英文原创源（Drew blog、TNS、RealPython）因篇幅长、技术深，中文社区主要做独立原创解读而非直接摘要/改写。
- 知乎（zhuanlan.zhihu.com）是最可能有 summary/rewrite 的平台，但 DDG fetch 对该域名返回 403，无法验证。
- CSDN 内容多为 AI 生成低质量文章，不符合 summary/rewrite 严格判据。
- 三个独立的原始教程（softaims、devstarsj、cnblogs）说明该主题中文社区更倾向于独立创作而非转载。

---

## Phase 2: Query 2 快速评估（PostgreSQL 17 增量备份 pg_combinebackup）

### 初步发现

通过快速搜索评估，该主题的 summary/rewrite 模式：

- **DZone 英文原文 → segmentfault 中文摘要**: segmentfault 标明 "原文链接: https://dzone.com/articles/incremental-backups-pg-basebackup-postgresql"，为 DZone 文章的压缩版 core claim subset。→ 可判定为 **semantic-summary**（1 pair）
- **官方文档 (T1)** → 中文社区文章（cloud.tencent/2381791, cnblogs/wy123）: cloud.tencent 文章有独立解释和代码示例（含完整的 base.tar 备份命令、jq 解析 manifest 等），不是简单的官方文档压缩版或改写。→ **不合并**
- **官方发布公告** → 多个教程: dev.to、jusdb.com 等英文教程都是独立原创，结构与官方文档不同。→ **不合并**

初步评估：仅 1 对可验证 summary/rewrite（< 3），可能也不满足门槛。

### 待进一步验证（如需执行 Query 2 完整 Phase 1+2）

若需继续执行 Query 2，需完成：
- 完整 sub-Q 分解（Q1: 增量备份核心机制；Q2: 迁移启用方式；Q3: 社区教程化）
- 3 路 fanout 搜索（R1/R2/R3）
- 至少 10 个 URL fetch（含官方源、中文社区、教程类、疑似改写类）