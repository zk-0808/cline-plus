# Run 14 — Phase 0 Evidence Pool

> **查询**: 评估无头浏览器抓取穿透 Cloudflare 等反爬的可行方案
> **日期**: 2026-06-26
> **SKILL 状态**: ✅ 已加载
> **搜索后端**: duckduckgo-websearch → 切换为 search-mcp-wrapper（节流熔断 wrapper，第 1 次熔断 30s，第 2 次 2min，第 3 次 10min）
> **输出用途**: 非结构化 evidence pool，不做最终答案

---

## §1 搜索结果原始池

### Q1: Playwright 绕过 Cloudflare 的有效性与被识别风险

**搜索 query（R1 直白型）**: `Playwright bypass Cloudflare anti-bot detection stealth 2025`
**搜索结果数**: 10/10

| # | 标题 | URL | Snippet | T-Level | 来源路 |
|---|------|-----|---------|---------|--------|
| 1 | playwright cannot bypass cloudflare bot detection even adding ... | https://stackoverflow.com/questions/79000090/playwright-cannot-bypass-cloudflare-bot-detection-even-adding-cookies-and-user-a | "use playwright-stealth. this doesn't work. when I turn on the stealth mode, for the website in question, the loaded page will be blank." | T3 — Stack Overflow | R1 |
| 2 | Playwright Anti-Bot Detection: What Works (2026) | AlterLab | https://alterlab.io/blog/playwright-bot-detection-what-actually-works-in-2026 | "covers the specific detection vectors that flag Playwright, what stealth techniques actually work in 2026" | T3 — 商业爬虫博客 | R1 |
| 3 | Playwright Cloudflare Bypass: BQL Guide for Scraping | Browserless | https://www.browserless.io/blog/bypass-cloudflare-with-playwright | "Playwright Cloudflare scraping is tough, but not impossible." | T3 — 商业服务博客 | R1 |
| 4 | Avoid Bot Detection With Playwright Stealth: 9 Solutions for 2025 | Scrapeless | https://www.scrapeless.com/en/blog/avoid-bot-detection-with-playwright-stealth | "Master Playwright stealth techniques to bypass bot detection in 2025" | T3 — 商业爬虫博客 | R1 |
| 5 | How to Bypass Cloudflare with Playwright in 2025 | Kameleo | https://kameleo.io/blog/how-to-bypass-cloudflare-with-playwright | "Playwright is often flagged by Cloudflare due to its identifiable patterns and default browser settings." | T3 — 商业抗检测浏览器 | R1 |
| 6 | How to Bypass Cloudflare with Playwright in 2026 | BrowserStack | https://www.browserstack.com/guide/playwright-cloudflare | "Learn how to configure Playwright to handle Cloudflare detection" | T3 — 商业测试平台博客 | R1 |
| 7 | Playwright Stealth: Bypass Bot Detection in Python & Node.js | Scrapfly | https://scrapfly.io/blog/posts/playwright-stealth-bypass-bot-detection | "Learn how to use Playwright stealth to bypass bot detection" | T3 — 商业爬虫博客 | R1 |
| 8 | How to Bypass Cloudflare with Playwright | ZenRows | https://www.zenrows.com/blog/playwright-cloudflare-bypass | "Learn how to bypass Cloudflare with Playwright" | T3 — 商业爬虫博客 | R1 |
| 9 | GitHub — HasData/cloudflare-bypass | https://github.com/HasData/cloudflare-bypass | "minimal working examples for bypassing Cloudflare 1020 errors using Playwright" | T2 — GitHub 项目仓库 | R1 |
| 10 | Playwright Cloudflare Bypass 2026: 3 Methods That Still Work (9 Don't) | https://humanbrowser.cloud/blog/bypass-cloudflare-playwright-2026 | "Stock Playwright fails Cloudflare in milliseconds." | T3 — 商业爬虫博客 | R1 |

**搜索 query（R1 替代 — 反证自然语言）**: `Playwright detected by Cloudflare bot detection`
**搜索结果数**: 10/10

| # | 标题 | URL | T-Level | 来源路 |
|---|------|-----|---------|--------|
| 11 | Why Your Playwright Scripts Keep Getting Blocked by Cloudflare (And How To Fix It) | https://clawbrowser.ai/blog/why-your-playwright-scripts-keep-getting-blocked-by-cloudflare-and-how-to-fix-it/ | T3 — 商业抗检测浏览器博客 | R3 替代 |
| 12 | Playwright Stealth: Bypass Bot Detection in Python & Node.js (Scrapfly) | https://scrapfly.io/blog/posts/playwright-stealth-bypass-bot-detection | T3 — 同上 #7 | R3 替代 |
| 13 | How to Avoid Bot Detection with Playwright | BrowserStack | https://www.browserstack.com/guide/playwright-bot-detection | T3 — 同上 #6 | R3 替代 |

**R2（限域型）**: 未执行 — DDG bot detection 对 `site:` query 敏感。用自然语言 query 替代覆盖社区源。

---

### Q2: nodriver / undetected-chromedriver 绕过 Cloudflare 的有效性与被识别风险

**搜索 query（R1 直白型 替代）**: `"undetected-chromedriver" Cloudflare bypass`
**搜索结果数**: 4/10

| # | 标题 | URL | Snippet | T-Level | 来源路 |
|---|------|-----|---------|---------|--------|
| 1 | ultrafunkamsterdam/undetected-chromedriver - GitHub | https://github.com/ultrafunkamsterdam/undetected-chromedriver | "Custom Selenium Chromedriver | Zero-Config | Passes ALL bot mitigation systems" | T2 — GitHub 项目仓库 | R1 |
| 2 | Bypassing Cloudflare, Akamai, etc - GitHub Gist | https://gist.github.com/0xdevalias/b34feb567bd50b37161293694066dd53 | "Uses Selenium with the undetected-chromedriver to create a web browser" | T3 — Gist | R1 |
| 3 | ByPass Cloudflare Challenges using Selenium - BrowserStack | https://www.browserstack.com/guide/selenium-cloudflare | "Libraries like undetected-chromedriver or selenium-stealth help your scripts behave more like a human-operated browser" | T3 — 商业测试平台博客 | R1 |
| 4 | 5 Working Methods to Bypass Cloudflare (January 2026 Updated) | https://scrape.do/blog/bypass-cloudflare/ | "Undetected-Chromedriver — free, customizable, but limited. Can't bypass Cloudflare Turnstile." | T3 — 商业爬虫博客 | R1 |

---

### Q3: Camoufox 指纹伪装绕过 Cloudflare 的有效性与被识别风险

**搜索 query（R1 直白型 替代）**: `"Camoufox" Cloudflare anti-bot detect`
**搜索结果数**: 10/10

| # | 标题 | URL | T-Level | 来源路 |
|---|------|-----|---------|--------|
| 1 | How to use Camoufox to bypass anti-bots in 2026 | https://roundproxies.com/blog/camoufox/ | T3 — 商业博客 | R1 |
| 2 | How to Scrape With Camoufox to Bypass Antibot Technology | https://www.scrapingbee.com/blog/how-to-scrape-with-camoufox-to-bypass-antibot-technology/ | T3 — 商业爬虫博客 | R1 |
| 3 | GitHub - redf0x1/camofox-browser | https://github.com/redf0x1/camofox-browser | T2 — GitHub 项目 | R1 |
| 4 | Camofox Browser: Anti-Detection Browser Server for AI Agents | https://pyshine.com/Camofox-Browser-Anti-Detection-Browser-Server/ | T3 — 技术博客 | R1 |
| 5 | Camoufox vs. Kameleo: Bypass Bot Blocks | https://kameleo.io/blog/camoufox-vs-kameleo-bypass-bot-blocks | T3 — 商业抗检测浏览器 | R1 |
| 6 | Web Scraping with Camoufox to Bypass Anti-bots - ZenRows | https://www.zenrows.com/blog/web-scraping-with-camoufox | T3 — 商业爬虫博客 | R1 |
| 7 | Web Scraping with Camoufox: A Developer's Complete Guide | https://decodo.com/blog/web-scraping-guide-with-camoufox | T3 — 博客 | R1 |
| 8 | GitHub - daijro/camoufox | https://github.com/daijro/camoufox | T2 — GitHub 主仓库 | R1 |
| 9 | Web Scraping with Camoufox: Complete Guide (2026) | https://brightdata.com/blog/web-data/web-scraping-with-camoufox | T3 — 商业代理博客 | R1 |
| 10 | kesslerio/camoufox-stealth-browser-clawhub-skill - GitHub | https://github.com/kesslerio/camoufox-stealth-browser-clawhub-skill | T3 — GitHub 项目 | R1 |

---

### Q4: FlareSolverr 绕过 Cloudflare 的有效性与被识别风险

**搜索 query（R1 直白型 替代）**: `"FlareSolverr" Cloudflare bypass detect fail 2026`
**搜索结果数**: 10/10

| # | 标题 | URL | T-Level | 来源路 |
|---|------|-----|---------|--------|
| 1 | FlareSolverr 2026: Guide to Bypassing Cloudflare Challenges | https://iproyal.com/blog/flaresolverr-python-guide/ | T3 — 商业代理博客 | R1 |
| 2 | Unable to detect Cloudflare challenge for some sites #1734 | https://github.com/FlareSolverr/FlareSolverr/issues/1734 | T2 — GitHub Issue（反证） | R1 |
| 3 | How to Bypass Cloudflare With Scraping (2026) | https://www.browserless.io/blog/how-to-bypass-cloudflare-scraping | T3 — 商业服务博客 | R1 |
| 4 | Challenge Detection and Solving | FlareSolverr/FlareSolverr | DeepWiki | https://deepwiki.com/FlareSolverr/FlareSolverr/5.3-challenge-detection-and-solving | T2 — 项目文档 | R1 |
| 5 | How to Bypass Cloudflare with Flaresolverr in 2026 | https://pixelscan.net/blog/bypass-cloudflare-with-flaresolverr/ | T3 — 博客 | R1 |
| 6 | FlareSolverr - Bypass Cloudflare Protection for Jackett | https://chns.tech/posts/2026/04-17-flaresolverr-jackett-integration/ | T3 — 个人技术博客 | R1 |
| 7 | How to use Byparr in 2026 (FlareSolverr 替换品) | https://roundproxies.com/blog/byparr/ | T3 — 商业博客 | R1 |
| 8 | cloudflare detection · FlareSolverr FlareSolverr · Discussion #866 | https://github.com/FlareSolverr/FlareSolverr/discussions/866 | T2 — GitHub Discussion（反证） | R1 |
| 9 | Can't bypass JS detection · Issue #783 · FlareSolverr/FlareSolverr | https://github.com/FlareSolverr/FlareSolverr/issues/783 | T2 — GitHub Issue（反证） | R1 |
| 10 | [btdigg] flaresolverr does not detect challenge #771 | https://github.com/FlareSolverr/FlareSolverr/issues/771 | T2 — GitHub Issue（反证） | R1 |

---

### Q5: cloudscraper 绕过 Cloudflare 的有效性与被识别风险

**搜索 query（R1 直白型 替代）**: `"cloudscraper" Cloudflare bypass fail detect 2025 2026`
**搜索结果数**: 8/10

| # | 标题 | URL | T-Level | 来源路 |
|---|------|-----|---------|--------|
| 1 | GitHub - Anorov/cloudflare-scrape | https://github.com/Anorov/cloudflare-scrape | T2 — GitHub 原仓库（3.5k stars） | R1 |
| 2 | Can't bypass cloudflare with python cloudscraper | https://stackoverflow.com/questions/65604551/cant-bypass-cloudflare-with-python-cloudscraper | T3 — StackOverflow（反证） | R1 |
| 3 | 5 Best Alternatives to Cloudscraper for Web Scraping in 2026 | https://sites.google.com/view/thisweeksoftly/5-best-alternatives-to-cloudscraper-for-web-scraping-in-2026 | T3 — 博客 | R1 |
| 4 | From Cloudflare Bypass to Credit Card Theft - Imperva | https://www.imperva.com/blog/from-cloudflare-bypass-to-credit-card-theft/ | T2 — Imperva 安全报告 | R1 |
| 5 | From Cloudflare Bypass to Credit Card Theft - Security Boulevard | https://securityboulevard.com/2025/07/from-cloudflare-bypass-to-credit-card-theft/ | T3 — 转载 | R1 |
| 6 | Cloudscraper for Python: Cloudflare Bypass & Proxies (2025) | https://evomi.com/blog/cloudscraper-python-cloudflare-proxies-2025 | T3 — 商业代理博客 | R1 |
| 7 | Bypass protection cloudflare using python cloudscraper | https://stackoverflow.com/questions/79191096/bypass-protection-cloudflare-using-python-cloudscraper | T3 — StackOverflow | R1 |
| 8 | How to Fix Common Cloudscraper Issues & Errors | https://roundproxies.com/blog/cloudscraper-errors/ | T3 — 商业代理博客 | R1 |

---

### Q6: 托管云浏览器（Browserless/Scrapfly/ZenRows 等）绕过 Cloudflare 的有效性

**搜索状态**: ❌ 未成功执行 — DDG `OR` query 无结果，单 query 触发 bot detection
**替代证据**: 已通过 fetch_content 抓取到 Browserless 和 Scrapfly 的文章（见 §2 归档）

---

### Q7: 住宅代理 / CAPTCHA 依赖

**搜索状态**: ❌ 未成功执行 — 触发第 3 次熔断
**替代证据**: 已通过 Scrape.do 文章（Q2 结果#4）、Evomi cloudscraper 文章、IPRoyal FlareSolverr 文章间接覆盖

---

### Q8: 适用边界与组合

**搜索状态**: ❌ 未成功执行
**替代证据**: HumanBrowser 的 12-method 对比表和 Scrape.do 的 5-method 对比表已涵盖大部分方案间的横向比较

---

## §2 fetch_content 全文归档（Iron Law）

### 2.1 AlterLab — Playwright Anti-Bot Detection: What Works (2026)
**URL**: https://alterlab.io/blog/playwright-bot-detection-what-actually-works-in-2026
**状态**: ✅ 成功

关键内容摘要（全文见上方 tool output）：
- "87% Sites using at least one anti-bot service"
- "<2 sec Average bot detection time"
- "12+ Fingerprint vectors checked"
- "3x Detection rate increase since 2024"
- `navigator.webdriver` 是首检指标
- Headless Chromium 在 plugins、WebGL、screen dimensions、permissions API 等多处泄漏指纹
- CDP Protocol Leak & TLS Fingerprinting (JA3/JA4) 是最难修复的两个
- playwright-stealth 能 patch `navigator.webdriver`/plugins/chrome.runtime，但**不能修** WebGL/TLS/behavioral
- Cookie persistence、Request interception 等技术可作为补充
- 完整代码示例：stealth patch → 上下文加固 → cookie persist → route interception

### 2.2 HumanBrowser — Playwright Cloudflare Bypass 2026: 3 Methods That Still Work (9 Don't)
**URL**: https://humanbrowser.cloud/blog/bypass-cloudflare-playwright-2026
**状态**: ✅ 成功

关键内容：
- **最后更新 2026-05-27** — Cloudflare ML v9 / Web Bot Auth 时代
- 12-method 测试表（500 请求/变体，8 个 CF 保护站点）：

| 方法 | 通过率 Pro | 通过率 Ent | 结论 |
|------|-----------|-----------|------|
| Vanilla Playwright VPS | ~2% | 0% | Dead |
| playwright-extra+stealth VPS | ~5% | 0% | Dead |
| undetected-chromedriver VPS | ~8% | 0% | Dead |
| FlareSolverr proxied VPS | ~3% | 0% | Dead |
| curl-impersonate solo VPS | ~6% | 0% | No JS |
| Puppeteer DC proxy | ~4% | 0% | Dead |
| VPN+Playwright | ~10% | 0% | Flaky |
| **Residential IP only** | **~35%** | **~5%** | **Partial** |
| **Residential + stealth FP** | **~70%** | **~25%** | **Decent** |
| **Residential + iPhone FP + human input** | **~95%** | **~75%** | **Works** |
| **Human Browser managed** | **~97%** | **~78%** | **Works** |
| Web Bot Auth (signed agent) | 100% opted-in | 0% non-opted | Depends |

- 3 件事 CF 实际检查：① IP 信誉 & ASN 分类 ② 浏览器指纹一致性 ③ 行为分析
- 2026 H1 三大变化：ML v9 默认 / anomaly detection bot score floor=2 / Web Bot Auth 推出
- Error 1020 = IP 信誉问题（不是脚本问题）
- **关键结论**: "There is no magic flag. There is only a stack."

### 2.3 Browserless — Playwright Cloudflare Bypass: BQL Guide
**URL**: https://www.browserless.io/blog/bypass-cloudflare-with-playwright
**状态**: ✅ 成功

关键内容：
- playwright-extra + puppeteer-extra-plugin-stealth（注意：Node.js 生态，Python 另表）
- Headed mode > headless mode 减少检测
- Persistent session profile（cookies/localStorage）
- 旋转住宅代理 + 动态 CAPTCHA 检测
- "No bypass holds forever. Cloudflare ships new detection signals on its own schedule."

### 2.4 GitHub — HasData/cloudflare-bypass
**URL**: https://github.com/HasData/cloudflare-bypass
**状态**: ✅ 成功（37 stars）
- Playwright + Stealth + 住宅代理旋转 + header 伪装 + 类人行为 的 Python/Node.js 示例合集

### 2.5 Scrapfly — Playwright Stealth: Bypass Bot Detection
**URL**: https://scrapfly.io/blog/posts/playwright-stealth-bypass-bot-detection
**状态**: ✅ 成功

关键内容：
- "Stealth only solves fingerprint-level detection. It does not fix IP reputation, TLS fingerprinting, behavioral analysis, or advanced JavaScript challenges"
- Python playwright-stealth 2026 活跃维护（v2.x），Node.js 生态落后
- chrome.runtime evasion v2.x 默认 disabled（兼容性问题）
- 仅支持 Chromium，不支持 Firefox/WebKit

### 2.6 ClawBrowser — Why Playwright Scripts Get Blocked by Cloudflare
**URL**: https://clawbrowser.ai/blog/why-your-playwright-scripts-keep-getting-blocked-by-cloudflare-and-how-to-fix-it/
**状态**: ✅ 成功

关键内容：
- "The first 200 milliseconds of a Cloudflare-protected page load involve a stack of fingerprint and behavioral checks"
- **6 signals**: ① navigator.webdriver ② TLS JA3/JA4 ③ HTTP/2 frame ordering ④ Canvas/WebGL/audio ⑤ Timezone×locale×IP geo coherence ⑥ Behavioral
- 4 Tier 修复方案（Tier 4 最小可靠 → Tier 1 引擎级身份一致性）
- "Engine-level patching means detection systems can't pattern-match the stealth itself, because there's no stealth code running on the page"

### 2.7 Scrape.do — 5 Working Methods to Bypass Cloudflare (2026)
**URL**: https://scrape.do/blog/bypass-cloudflare/
**状态**: ✅ 成功

核心对比表：

| 方案 | CF Challenge | CF Turnstile | 设置难度 | 速度 | 资源消耗 | 隐蔽度 |
|------|-------------|-------------|---------|------|---------|-------|
| Scrape.do API | ✅ | ✅ | Easy | Instant | None | Very High |
| Undetected-Chromedriver | ✅ | ❌ | Medium | Slow | High | Medium |
| Rebrowser-Puppeteer | ✅ | ✅ | Medium | Medium | High | High |
| CF-Clearance-Scraper | ✅ | ✅ | Hard | Medium | High | Medium |
| Camoufox | ✅ | ✅ | Medium | Slow | High | Very High |

### 2.8 GitHub — daijro/camoufox
**URL**: https://github.com/daijro/camoufox
**状态**: ✅ 成功（9.6k stars）

关键内容：
- Firefox fork, open source anti-detect browser
- 指纹欺骗在 C++ 层（非 JS 注入）
- 每次运行获得真实世界生成的新身份
- 处于 active development（548 commits）
- 需要旋转代理配合 → 附带众多代理赞助商

### 2.9 ScrapingBee — How to Scrape With Camoufox to Bypass Antibot Technology
**URL**: https://www.scrapingbee.com/blog/how-to-scrape-with-camoufox-to-bypass-antibot-technology/
**状态**: ✅ 成功

关键内容：
- Camoufox 在 CreepJS 测试中得分最高——与真人浏览器无法区分
- 核心特性：指纹欺骗 / 隐身补丁 / 反字体指纹 / 性能优化 / uBlock 集成
- GeoIP + Proxy 自动匹配时区/语言
- 使用头部模式 + uBlock + 持久配置可绕过 Turnstile
- Python API：`pip install camoufox[geoip]` → `camoufox fetch` → `from camoufox.sync_api import Camoufox`
- **限制**: canvas 伪装在 CreepJS 的"trashes"指标上失败（来自 Kameleo 对比文章）

### 2.10 Kameleo — Camoufox vs. Kameleo: Bypass Bot Blocks
**URL**: https://kameleo.io/blog/camoufox-vs-kameleo-bypass-bot-blocks
**状态**: ✅ 成功

关键内容（商业对比文，需注意偏差）：
- Camoufox 基于 Firefox 135（Firefox 138 已于 4 月发布 → 指纹屏蔽效果降低）
- "Camoufox's canvas spoofing fails CreepJS's 'trashes' metric and shows a 100% unique fingerprint on BrowserLeaks"
- Camoufox 无内置指纹库、无内置浏览器池管理器、仅支持 Playwright/Python
- Kameleo 提供多引擎支持（Chroma/Junglefox）、SDK 支持多语言、自动指纹更新
- 字体跟踪、WebGL/WebRTC block 模式可能降低隐蔽分数

### 2.11 GitHub — FlareSolverr/FlareSolverr
**URL**: https://github.com/FlareSolverr/FlareSolverr
**状态**: ✅ 成功（14.5k stars）

关键内容：
- Selenium + undetected-chromedriver 创建真实浏览器
- 返回 HTML + cookies 供后续 HTTP 复用
- 推荐 Docker 部署
- `session.create/destroy/list` 支持 cookie 持久化
- 每个请求启动一个新的浏览器实例 → 内存消耗大
- **已知限制**: 对 Turnstile 支持有限；并非所有 CF 版本都能检测到挑战（issue #1734/#771）

### 2.12 IPRoyal — FlareSolverr 2026 Guide
**URL**: https://iproyal.com/blog/flaresolverr-python-guide/
**状态**: ✅ 成功

关键内容：
- "FlareSolverr was once the go-to for almost all Cloudflare hurdles, but the rise of behavioral analysis has made it less of a silver bullet"
- 局限性：每个请求启动 headless 浏览器 → 性能开销大；无法原生解决交互式 CAPTCHA
- 需要结合第三方 solving service
- 推荐使用高质量住宅/移动代理

### 2.13 Pixelscan — How to Bypass Cloudflare with Flaresolverr in 2026
**URL**: https://pixelscan.net/blog/bypass-cloudflare-with-flaresolverr/
**状态**: ✅ 成功

关键内容：
- FlareSolverr 500 Internal Server Error 常见原因：过时浏览器内核 / 损坏依赖 / 请求参数错误 / CF 规则收紧
- 更新 FlareSolverr + 依赖 + Chromium 可解决大部分问题
- 脏 IP / 过度使用的代理会触发 CF → 推荐干净住宅 IP

### 2.14 GitHub — Anorov/cloudflare-scrape (cloudscraper)
**URL**: https://github.com/Anorov/cloudflare-scrape
**状态**: ✅ 成功（3.5k stars）

关键内容：
- 仅适用于 CF "I'm Under Attack Mode"（JS 检查），不适用于 reCAPTCHA
- 需要 Node.js 10+ 解释 CF 混淆 JavaScript
- 首次访问睡眠 5s，后续无延迟
- Python 2.6-3.7 支持（注意：版本范围暗示可能已停滞）

### 2.15 Evomi — Cloudscraper for Python: Cloudflare Bypass & Proxies (2025)
**URL**: https://evomi.com/blog/cloudscraper-python-cloudflare-proxies-2025
**状态**: ✅ 成功

关键内容：
- Cloudscraper 扩展 `requests` 库：代理 JS 挑战、管理 UA、应对基本指纹
- 支持第三方 CAPTCHA 解决服务集成（2captcha/capsolver）
- 无法完美模拟字体/插件/渲染等深入指纹检查
- 代理集成：标准 `proxies=` 参数

### 2.16 RoundProxies — How to Fix Common Cloudscraper Issues & Errors
**URL**: https://roundproxies.com/blog/cloudscraper-errors/
**状态**: ✅ 成功

关键内容：
- CAPTCHA 错误：旋转 IP + 延迟间隔 + 调整浏览器模拟
- JS Challenge 失败：升级到 browser automation（Selenium/Playwright）
- Challenge 循环：指数退避 + 新鲜 scraper + cookie 处理
- `CloudflareChallengeError: Detected a Cloudflare version 2 challenge, This feature is not available in the opensource (free) version`

### 2.17 GitHub — ultrafunkamsterdam/undetected-chromedriver
**URL**: https://github.com/ultrafunkamsterdam/undetected-chromedriver
**状态**: ✅ 成功（12.7k stars）

关键内容：
- "THIS PACKAGE DOES NOT, and i repeat DOES NOT hide your IP address"
- 从数据中心运行时"chances are large you will not pass"
- 从家庭 IP 运行时最有效
- headless 模式在 Chrome 110 后已 patch（仍 unofficial）
- Headless 自 Chrome 110 后已被修复（仍 unofficial）
- ⭐ 成功通过 nowsecure.nl 测试（社区标准）
- 注意：Python 3.12+ 可能缺少 distutils（需 setuptools）

### 2.18 GitHub — ultrafunkamsterdam/nodriver
**URL**: https://github.com/ultrafunkamsterdam/nodriver
**状态**: ✅ 成功（4.4k stars）

关键内容：
- Undetected-Chromedriver 的官方继任者
- 完全异步、无 chromedriver/Selenium 依赖
- CDP 直接通信 → 更高 WAF 抵抗
- `tab.cf_verify()` — 自动点击 CF Turnstile 验证框（需 opencv-python）
- `start(expert=True)` — 禁用 web security + origin-trials + 强制打开 shadow roots（检测风险更高）

---

## §3 反证不足汇总

| 缺口 | 类型 | 影响 |
|------|------|------|
| Q1 R2（限域型 `site:reddit.com OR site:news.ycombinator.com`）未执行 | DDG bot detection 对 `site:` 敏感 | 缺少 Reddit/HN 社区一手讨论；已用自然语言 query 替代 |
| Q1 R3（反证型 "Playwright fail Cloudflare"）部分执行 | Search 返回的非纯反证 | 已用反证方向自然语言 query 覆盖，含 SO 用户失败报告 |
| Q6（托管云浏览器）R1 搜索不可用 | DDG 熔断触发后封堵 | 已通过 Browserless/Scrapfly fetch 间接覆盖 |
| Q7（代理依赖）R1 搜索不可用 | DDG 第 3 次熔断 | 已通过多篇文章（Scrape.do/Evomi/IPRoyal）间接覆盖 |
| Q8（适用边界对比）未搜索 | DDG 第 3 次熔断 | 已通过 HumanBrowser 12-method + Scrape.do 5-method 对比表覆盖大部分 |
| Q2-Q8 的 R2（限域型）和 R3（反证型）全部未执行 | DDG `site:` 敏感性 + 熔断 | 结论置信度受限 |
| fetch_content 只成功抓取了主要 URL（部分 URL 如 SO 返回 403） | 目标站点反爬 | SO 内容需替代方式获取 |
| 大部分来源为 T3（商业博客）或 T2（GitHub），无 T1 官方文档 | 搜索引擎 + 主题性质 | Cloudflare/Playwright 官方不提供"绕过"文档 |
| Camoufox vs Kameleo 对比包含商业偏差 | 来源为 Kameleo 自有 blog | canvas 失败结论需交叉验证 |

> **根本原因**: DDG 后端对 `site:` 限域查询持续触发 bot detection；wrapper 在 3 次 BOT_DETECTED 后触发指数退避熔断（最终 10min）。fetch_content 通道独立不受影响。降级方案已按规约执行——未用单方案池硬凑。

---

## §4 P3 Evidence Pool（三元组）

### E1
- **Claim**: Stock Playwright 在数据中心 IP 上失败率 ~98%（Pro）/ 100%（Enterprise）
- **Quote**: "Vanilla Playwright VPS — CF Pro ~2%, CF Enterprise ~0% — Dead"
- **Source**: https://humanbrowser.cloud/blog/bypass-cloudflare-playwright-2026 (12-method 内部测试)
- **Tier**: T3
- **Scope**: Cloudflare ML v9 / Pro vs Enterprise，2026-05-27 更新

### E2
- **Claim**: Cloudflare 实际检查 3 个信号层：IP 信誉 + 浏览器指纹一致性 + 行为分析
- **Quote**: "The 3 Things Cloudflare Actually Checks: 1. IP Reputation & ASN Classification 2. Browser Fingerprint Consistency 3. Behavioral Analysis"
- **Source**: https://humanbrowser.cloud/blog/bypass-cloudflare-playwright-2026
- **Tier**: T3
- **Scope**: Cloudflare ML v9，2026-05-27

### E3
- **Claim**: Stealth plugins 只解 fingerprint-level detection，不解 IP/TLS/behavioral
- **Quote**: "Stealth only solves fingerprint-level detection. It does not fix IP reputation, TLS fingerprinting, behavioral analysis, or advanced JavaScript challenges"
- **Source**: https://scrapfly.io/blog/posts/playwright-stealth-bypass-bot-detection
- **Tier**: T3
- **Scope**: Scrapfly 产品 blog，但独立判断，2026-04-28

### E4
- **Claim**: Playwright 驱动 Chromium 在 TLS JA3/JA4 握手层即被识别
- **Quote**: "Playwright's Chromium binary has a JA3 fingerprint that does not match any real Chrome release. This alone can get you blocked before any JavaScript even runs."
- **Source**: https://alterlab.io/blog/playwright-bot-detection-what-actually-works-in-2026
- **Tier**: T3
- **Scope**: 商业博客，但含技术细节

### E5
- **Claim**: Cloudflare ML v9 更激进加权 TLS fingerprint + HTTP/2 frame ordering + behavioral telemetry
- **Quote**: "ML model v9 is the new default (rolled to all zones, Q1 2026). v9 weights TLS fingerprint (JA4), HTTP/2 frame ordering, and behavioral telemetry more aggressively than v8."
- **Source**: https://humanbrowser.cloud/blog/bypass-cloudflare-playwright-2026
- **Tier**: T3
- **Scope**: 2026-05-27

### E6
- **Claim**: Residential IP + real mobile fingerprint + human-paced input 是目前唯一可靠的 DIY 方案（~95% Pro）
- **Quote**: "Residential + iPhone FP + human input — CF Pro ~95%, CF Enterprise ~75% — Works"
- **Source**: https://humanbrowser.cloud/blog/bypass-cloudflare-playwright-2026
- **Tier**: T3
- **Scope**: 12-method 内部测试，2026-05-27

### E7
- **Claim**: undetected-chromedriver 不隐藏 IP——数据中心 IP 基本无法通过
- **Quote**: "THIS PACKAGE DOES NOT, and i repeat DOES NOT hide your IP address, so when running from a datacenter (even smaller ones), chances are large you will not pass!"
- **Source**: https://github.com/ultrafunkamsterdam/undetected-chromedriver (README)
- **Tier**: T2 — 项目 README
- **Scope**: 项目文档，版本 3.x

### E8
- **Claim**: nodriver 通过 CDP 直接通信而非 chromedriver → 更高 WAF 抵抗
- **Quote**: "Direct communication provides even better resistance against web applicatinon firewalls (WAF's), while performance gets a massive boost."
- **Source**: https://github.com/ultrafunkamsterdam/nodriver (README)
- **Tier**: T2
- **Scope**: 项目文档，后续项目最新版

### E9
- **Claim**: Camoufox 在 CreepJS 检测工具中与真人浏览器无法区分
- **Quote**: "Of all the tools we tried, we found that Camoufox scored the best, being indistinguishable from a real, human-operated browser."
- **Source**: https://www.scrapingbee.com/blog/how-to-scrape-with-camoufox-to-bypass-antibot-technology/
- **Tier**: T3
- **Scope**: ScrapingBee 独立评测，2026-01-03

### E10
- **Claim**: Camoufox canvas spoofing 在 CreepJS 的 "trashes" 指标上失败
- **Quote**: "Camoufox's canvas spoofing fails CreepJS's 'trashes' metric and shows a 100% unique fingerprint on BrowserLeaks"
- **Source**: https://kameleo.io/blog/camoufox-vs-kameleo-bypass-bot-blocks（注意商业偏差）
- **Tier**: T3 — 商业竞争对手
- **Scope**: 需交叉验证

### E11
- **Claim**: FlareSolverr 对 2026 年的 Cloudflare Turnstile 支持有限，部分站点无法检测到挑战
- **Quote**: "FlareSolverr was once the go-to for almost all Cloudflare hurdles, but the rise of behavioral analysis has made it less of a silver bullet"
- **Source**: https://iproyal.com/blog/flaresolverr-python-guide/
- **Tier**: T3
- **Scope**: 2026-02-11 更新

### E12
- **Claim**: FlareSolverr 有已知 issue：无法检测/解决部分站点的 CF challenge（#1734, #771, #783）
- **Quote**: "Unable to detect Cloudflare challenge for some sites #1734 — The returned HTML is definitely the Cloudflare challenge page, which means FlareSolverr failed to detect the challenge."
- **Source**: https://github.com/FlareSolverr/FlareSolverr/issues/1734
- **Tier**: T2 — GitHub Issue
- **Scope**: 多用户报告，有时间戳

### E13
- **Claim**: cloudscraper（Anorov/cfscrape）仅适用于 JS check 类 CF 防护，不适用于 reCAPTCHA
- **Quote**: "Note: This only works when regular Cloudflare anti-bots is enabled (the 'Checking your browser before accessing...' loading page). If there is a reCAPTCHA challenge, you're out of luck."
- **Source**: https://github.com/Anorov/cloudflare-scrape (README)
- **Tier**: T2
- **Scope**: 项目文档（3.5k stars），但仅支持 Python 2.6-3.7 → 可能已停滞

### E14
- **Claim**: cloudscraper 在 CF v2 challenge 上返回 `CloudflareChallengeError` — 开源版不支持
- **Quote**: "CloudflareChallengeError: Detected a Cloudflare version 2 challenge, This feature is not available in the opensource (free) version"
- **Source**: https://stackoverflow.com/questions/65604551/cant-bypass-cloudflare-with-python-cloudscraper
- **Tier**: T3
- **Scope**: SO 用户报告

### E15
- **Claim**: Web Bot Auth（2026-05 推出）为已验证 AI agent 提供免 challenge 通道——但需要站点所有者 opt-in
- **Quote**: "Web Bot Auth: the legitimacy lane opens (May 2026)... it's an opt-in by the site owner, and the long tail of Cloudflare-protected sites have not enabled it."
- **Source**: https://humanbrowser.cloud/blog/bypass-cloudflare-playwright-2026
- **Tier**: T3
- **Scope**: 2026-05-27，Cloudflare 官方公告

### E16
- **Claim**: 引擎级指纹修复（非 JS 注入）是最持久的方案
- **Quote**: "Tier 1 (most reliable): Engine-level identity coherence... Engine-level patching means detection systems can't pattern-match the stealth itself, because there's no stealth code running on the page"
- **Source**: https://clawbrowser.ai/blog/why-your-playwright-scripts-keep-getting-blocked-by-cloudflare-and-how-to-fix-it/
- **Tier**: T3 — 商业产品 blog
- **Scope**: Multiple 独立来源印证（Camoufox C++ level, Clawbrowser, Kameleo）

### E17
- **Claim**: "There is no magic flag. There is only a stack." — 必须同时解决 IP + 指纹 + 行为三层
- **Quote**: "There is no magic flag. There is only a stack."
- **Source**: https://humanbrowser.cloud/blog/bypass-cloudflare-playwright-2026
- **Tier**: T3
- **Scope**: 2026-05-27

### E18
- **Claim**: undetected-chromedriver 无法绕过 Cloudflare Turnstile（Scrape.do 实测）
- **Quote**: "Undetected-Chromedriver — Can't bypass Cloudflare Turnstile: if the site uses Turnstile CAPTCHA, the request will hang or fail and there's no workaround."
- **Source**: https://scrape.do/blog/bypass-cloudflare/（测评表）
- **Tier**: T3
- **Scope**: 2026-01-26 更新，"5 Working Methods" 实际测试

---

## §5 续跑采集记录

本文件在 §4 之后追加的 §5 及之后内容，记录了从旧 DDG 后端切换为 search-mcp-wrapper 后的第 2 次采集。

### 执行情况总结

| Sub-Q | R1 直白型 | R2 限域型 | R3 反证型 | fetch_content | 状态 |
|-------|----------|----------|----------|---------------|------|
| Q1 | ✅ 10 条 + 增补 3 条 | ❌ site: 触发 DDG 检测 | ✅ 用自然语言替代 | ✅ 11 个 URL 成功 | ⚠️ 部分 |
| Q2 | ✅ 4 条（单引号 query） | ❌ DDG bot detection | ❌ DDG bot detection | ✅ 2 个 GitHub README | ⚠️ 部分 |
| Q3 | ✅ 10 条 | ❌ DDG bot detection | ❌ DDG bot detection | ✅ 3 个 URL | ⚠️ 部分 |
| Q4 | ✅ 10 条 | ❌ DDG bot detection | ❌ 已含反证 issue 链接 | ✅ 3 个 URL | ⚠️ 部分 |
| Q5 | ✅ 8 条 | ❌ DDG bot detection | ❌ 已含反证 SO 链接 | ✅ 3 个 URL | ⚠️ 部分 |
| Q6 | ❌ DDG OR query 无结果 → 熔断 | — | — | ✅ Browserless/Scrapfly 文章间接覆盖 | ⚠️ 部分 |
| Q7 | ❌ 第 3 次熔断触发 | — | — | ✅ 多篇文章间接覆盖 | ❌ 未直接 |
| Q8 | ❌ 未执行 | — | — | ✅ HumanBrowser + Scrape.do 对比表间接覆盖 | ❌ 未直接 |

### 降级记录

按规约，第 3 次熔断（10min）触发后执行降级：
- **降级生效时间**: 12:25:35 UTC+8（第 3 次 CIRCUIT_OPEN 后）
- **降级条件**: 搜索熔断已触发 3 次（第 1 次 30s → 第 2 次 2min → 第 3 次 10min）
- **执行动作**: 停止 search 调用，仅用 fetch_content + 已有结果完成证据收集
- **主力 4 方案覆盖**: Playwright（Q1 ✅）、nodriver/undetected-chromedriver（Q2 ⚠️）、FlareSolverr（Q4 ✅）、cloudscraper（Q5 ✅）

---

## §6 wrapper 行为日志

| 指标 | 值 |
|------|------|
| 总 search 调用次数（含 wrapper 内部重试） | ~12 次（用户可见）+ 每次失败时 wrapper 内 3 次重试 |
| 总 fetch_content 调用次数 | ~18 次 |
| 熔断触发次数 | **3 次** |
| 第 1 次触发时间 | ~12:15:32（Q2 连续失败） → 30s 熔断 |
| 第 2 次触发时间 | ~12:16:29（Q6 失败） → 2min 熔断 |
| 第 3 次触发时间 | ~12:25:35（Q6/Q7 失败） → 10min 熔断 |
| 是否触发降级 | ✅ 是（第 3 次熔断后停止 search，仅用 fetch + 已有结果） |
| 降级生效时间 | 12:25:35 UTC+8 |
| CIRCUIT_OPEN 首次出现 | 12:23:54（blockedUntil 2026-06-26T04:24:18.769Z） |
| site: 限域 query 结果 | 全部触发 BOT_DETECTED（wrapper 内部 3 次重试耗尽） |
| OR 复合 query 结果 | 部分无结果（DDG 后端限制），部分触发检测 |
| 单引号 query 结果 | 效果好（"" 包围的关键词可稳定返回 4-10 条） |
| fetch_content 独立性 | ✅ 验证：即使在熔断期内也可正常调用 |
| fetch_content 失败 | SO/Hacker News 返回 403；部分 URL 返回 404/500 |

### 经验教训（针对 #24 功能性验证）

1. **site: 限域 query 不可用于 DDG 后端**——会 100% 触发 bot detection（wrapper 内部 3 次重试耗尽）
2. **OR 复合 query 不稳**——部分无结果，部分触发检测
3. **单引号 query 最稳定**——`"<关键词>"` 形式可获得 4-10 条一致结果
4. **熔断恢复后第 1 次 search 易触发新熔断**——可能因为 wrapper 重置后重新计数，但 DDG 仍在冷启动
5. **fetch_content 独立通道验证通过**——熔断期间可稳定调用