# Development Log

## 2026-08-25 — V3 Final Review / Freeze

- Freeze base: `d7ffd8ef19f8edf2842ee926739a73aeca31ce00`
- Frozen V3 closure: 首页发现标的 → A股/ETF 详情页研究 → 四段式本地记录（为何关注、观察点、计划、风险点）→ 按资产回看时间线 → 追加或删除记录 → JSON 全量导出 → JSON 整体恢复。
- 记录固定保存在浏览器 `myinvest.researchNotes.v1`；笔记不经过网络或服务端，不进入公开 HTML、URL、日志或 Git。导入只接受版本 1 的完整备份包，确认后整体替换，不做合并或去重。
- V3 明确不包含编辑、标签/搜索、AI/新闻/评分/交易信号、云同步、DuckDB、服务端笔记接口、登录或数据迁移。

### Final regression

- `npm test`（12 项）、`npm run build` 与 `git diff --check` 通过；`/`、`/market`、`/stock/600350.SH` 本地及公网基础可用性回归通过。
- V2 首页行为未改动；package 与 package-lock 未变化；`.local/watchlist.csv` 仍不进 Git。服务端 HTML 不含 API key、`X-api-key`、`fuyao.aicubes.cn` 或浏览器本地笔记正文。
- ETF 上游仍可能返回既有不支持/未找到状态，冻结不伪造数据。Task 5 的真实浏览器覆盖恢复测试仍受内置浏览器隔离环境无法访问本机临时服务所限，未把该限制表述为已完成的真实用户数据测试。

## 2026-08-25 — V3 Task 5 恢复本地研究记录备份

研究记录标题区域在导出按钮旁增加“从备份恢复”。用户选择 JSON 后，页面只接受 `{ version: 1, exportedAt, notes }` 的完整备份包：版本必须为 1，导出时间必须为有限数字，且每条记录必须符合现有研究记录结构。任一项不符就显示“备份文件无效”，不写入 localStorage，也不改动当前时间线。

通过验证后，页面明确提示恢复会用备份中的全部记录替换当前记录；只有用户确认才把备份中的原始完整 `notes` 数组写回同一个 localStorage key。恢复不做合并、去重、冲突处理或服务器上传。即使既有本地数据已不可读取，合法且确认的备份也可以恢复它；文件输入每次处理后清空，允许再次选择同一份备份。

### Verification

- `npm test` 与 `npm run build` 通过；TypeScript 编译覆盖文件读取、完整结构校验、确认后替换及不可读取状态恢复路径。
- 内置浏览器隔离环境无法连接本机临时 `127.0.0.1:8031`（命令行本机请求为 HTTP 200），因此没有用真实用户浏览器的 localStorage 执行覆盖测试，避免改动公开站点的现有本地记录。

## 2026-08-25 — V3 Task 1 A股/ETF 详情页桌面优先统一

V3 启动后先处理实际存在的布局不一致：首页已使用 1180px 桌面看板宽度，而 A股与 ETF 详情页仍沿用全局 680px 宽度。两个详情页及其错误状态现在明确使用 `asset-detail-page`，只在该页面范围将容器扩至与首页相同的桌面宽度。行情事实在宽度大于 900px 时以 6 列展示，在 561–900px 保持 3 列，在 560px 及以下继续沿用 2 列及窄容器。

本任务不改变首页、市场或行业页，不改变任何行情请求、指标、K 线逻辑或依赖。V3 的后续个人研究记录会优先使用浏览器本地持久化；当前公开部署不引入 DuckDB 或服务端笔记接口。

## 2026-08-25 — V3 Task 2 本地个人研究记录

详情页在研究指标与日线图之间增加同一个最小 Client Component。它只在浏览器挂载后读取固定的 `myinvest.researchNotes.v1` localStorage key，并按资产代码与资产类型过滤、按创建时间倒序展示。每条记录仅有为何关注、观察点、计划和风险点四段正文；任一非空即可新增，正文去除首尾空白后写入本地，历史记录不编辑也不删除。

笔记内容不进入服务端请求、公开 HTML、URL、日志或 Git。localStorage 缺失视为空记录；无法解析或不符合记录数组结构时，页面显示“研究记录暂不可读取”，且不会自动覆盖原始数据。

### Verification

- 在 `/stock/600350.SH` 只填写“为何关注”即可保存；刷新后该记录仍在。第二条只填写“计划”后立即排在第一条上方，空字段不显示标题。
- 进入 `/stock/600361.SH` 时显示“暂无研究记录”，不会显示 `600350.SH` 的记录。测试时 ETF 上游返回既有 `Fund not found` 或 `This fund does not support market data` 错误，详情页未进入客户端研究记录区域；该数据源失败未在本任务中修改。
- 1440px 时表单为 2×2，390×844 时为单列，均无横向溢出。服务端响应 HTML 不含浏览器中已保存的测试笔记正文。

## 2026-08-25 — V3 Task 3 删除单条研究记录

每条时间线记录现在在时间旁显示一个弱化的“删除”按钮。用户取消浏览器确认时不改变任何状态；确认后只从完整本地记录数组中按该记录 `id` 删除，再将完整数组写回同一个 localStorage key。组件继续按创建时间倒序显示，不影响其他标的、其他资产类型或剩余记录内容。

损坏数据的不可读取状态保持不变：不显示记录或删除按钮，也不会尝试写入 localStorage。本任务不增加编辑、撤销、回收站、批量删除或清空全部。

### Verification

- 为 `600350.SH` 创建三条本地测试记录后，点击删除并取消，三条记录均保留；确认删除中间记录后，仅该记录消失，刷新后剩余两条仍存在。
- `600361.SH` 继续显示“暂无研究记录”，未受 `600350.SH` 删除影响。390×844 下剩余记录、弱化删除按钮和表单均无横向溢出。

## 2026-08-25 — V3 Task 4 导出本地研究记录

研究记录标题区域增加“导出全部记录”次级按钮。它只在浏览器中将完整的有效记录数组包装成 `{ version: 1, exportedAt, notes }`，再通过 Blob 和下载链接生成带上海日期的 JSON 备份文件。导出不写 localStorage、不改变时间线、不发起网络请求，也不经过服务端。

没有记录或现有数据不可读取时，导出按钮禁用；不会为了导出而读取或覆盖损坏的原始 localStorage 值。本任务不实现导入、恢复、云同步或服务端文件存储。

### Verification

- 有两条现有本地记录时“导出全部记录”可用；点击只运行浏览器 Blob 下载逻辑。无记录和不可读取状态都由同一禁用条件阻止导出。
- 导出路径只读取 React 中已验证的完整 `notes` 数组；不会写 localStorage 或改变时间线。服务端 HTML 不含测试笔记正文或 localStorage key。

## 2026-08-24 — V2 Final Review / Freeze

### Freeze commit

- Base: `e8ba82715c0ef6a625f56e35dfccfe6f4210337b`
- Frozen V2 dashboard: self-selected latest snapshots → top-five daily focus → 5D/20D returns → turnover ratio → 20-day range position → 20-day sparkline → snapshot time/history cutoff → A-share/ETF research details.

### Final regression

- `npm test` passed all 12 tests; `npm run build` passed.
- Local and public `/`, `/market`, `/industry/884277.TI`, `/stock/600350.SH`, and `/etf/510500.SH` returned HTTP 200 where applicable.
- Public HTML for `/`, `/market`, `/stock/600350.SH`, and `/etf/510500.SH` contained no API key, `X-api-key`, or `fuyao.aicubes.cn`.
- V2 is frozen: no additional homepage indicators, API requests, or product features are added in this closeout.

## 2026-08-24 — V2 Task 8 重点关注快照时间

### Decision

- 重点标的直接显示已有 snapshot 时间：A 股显式代码模式时间为空时明确显示“行情时间未提供”，ETF 显示其真实上海时间；不以当前时间或历史日期替代。
- 行情快照时间与历史日线截止日并列展示，清楚区分其数据口径，不增加请求或表格列。

### Verification

- `npm test` 与 `npm run build` 通过；服务重启后继续监听 `0.0.0.0:8030`。

## 2026-08-24 — V2 Task 7 重点关注迷你走势

### Decision

- 重点标的单元格复用最后最多 20 根已排序历史收盘价，绘制中性 SVG 迷你走势；不增加请求、图表库或价格方向判断。
- 历史失败显示“走势暂不可用”，少于两根显示“走势数据不足”，相等价格绘制中线。

### Verification

- 当次 5 个重点标的均绘制一个带有无障碍标签的 SVG，均使用 20 个收盘价点；390 × 844 下仍为 5 个 SVG 且无横向溢出。

## 2026-08-24 — V2 Task 6 重点关注历史截止日

### Decision

- 每个重点标的复用已排序历史日线的最后一根 `date_ms`，明确标注历史指标截至的交易日；不使用请求时间、`history.timestamp` 或 `Date.now()` 替代。
- 快照列名改为“最新”，避免把最新可用 snapshot 误称为当日收盘；不增加请求或修改任何指标。

### Verification

- 当次五项重点标的历史最后 bar 的上海日期均为 `08-24`，页面显示“历史指标截至 08-24”；快照列显示“最新”。
- 390 × 844 下历史截止日、20 日位置小字与原五列同时可见，文档未横向溢出。

## 2026-08-24 — V2 Task 5 重点关注20日位置

### Decision

- 重点关注复用已有历史收盘价，显示最新收盘价在最近 20 个交易日收盘价区间中的位置；历史不足 20 根或区间无波动时显示“数据不足”。
- 不增加请求、突破判断、强弱标签、评分或交易信号；移动端把该指标放在标的单元格的小字中，保留原有五列。

### Verification

- `000603.SZ`（A 股）和 `159992.SZ`（ETF）按各自最后 20 根收盘价独立复算的位置分别为 `100%` 和 `20%`，与页面一致。
- 纯函数测试覆盖区间顶端、中间、数据不足和无波动区间；390 × 844 下桌面第六列隐藏为标的单元格中的“20日位置”，无横向溢出。

## 2026-08-24 — V2 Task 4 重点关注成交额比

### Decision

- 重点关注仅复用 V2 Task 3 已请求的五项历史数据，增加最近历史交易日成交额相对此前 20 个交易日平均成交额的客观比值；不新增 API 请求。
- 历史不足 21 根或此前 20 根平均成交额为 0 时显示“数据不足”，不产生 Infinity；不添加放量、缩量、评分或交易信号。

### Verification

- `000603.SZ`（A 股）和 `159992.SZ`（ETF）的当次历史各为 42 根；按最后一根成交额与此前 20 根平均值独立复算分别为 `2.11×` 与 `1.19×`，与首页一致。
- 纯函数测试覆盖 21 根正常值、仅 20 根数据不足及前 20 根均为 0 的基准；不增加历史请求，仍最多 5 个。
- 390 × 844 下重点表保留标的、今日、5 日、20 日与成交额比五列，文档宽度未溢出。

## 2026-08-24 — V2 Task 3 今日重点关注

### Decision

- 首页仅对按绝对单日涨跌幅排序的前五个可用 A 股或 ETF 拉取历史数据，补充 5 日和 20 日涨跌；不为全部 34 个自选标的逐一请求历史。
- A 股使用既有前复权日线，ETF 使用既有交易所日线；多日涨跌按最新收盘价相对于精确 N 个交易日前收盘价计算。
- 每个历史请求都通过 `Promise.allSettled` 隔离：单项失败仅显示“历史暂不可用”，不影响另外四项或原有完整行情表。

### Verification

- 当次重点五项为 `000603.SZ`、`002001.SZ`、`159992.SZ`、`688027.SH`、`159259.SZ`，共 5 个历史请求；独立按最新收盘价与 5、20 个交易日前收盘价复算，显示值一致。
- 临时注入首项 `HTTP_429` 后，重点区仍保留 5 行，仅该行显示“历史暂不可用”，完整行情表仍为 34 行；注入已恢复。
- `npm test`（6 项）和 `npm run build` 均通过；390 × 844 下文档宽度与视口一致，无横向溢出。
- 公网首页、A 股详情和 ETF 详情均为 HTTP 200，HTML 不含 API key、`X-api-key` 或上游主机。


## 2026-08-24 — Project kickoff

### Current state

- The repository is empty and has no prior commits or remote.
- Local credentials exist for Hithink Finance, Tushare, and FRED. Only environment-variable names were inspected; secret values must never be committed, logged, or sent to ChatGPT.
- The current product direction is a personal A-share research website built around the shortest useful research loop.

### Agreed constraints

- Optimize for a single-user personal research project, not a team or production system.
- Deliver the shortest runnable business loop before adding breadth.
- Prefer simple, direct implementations over extensible architecture.
- Do not add audit systems, RBAC, event buses, microservices, plugin frameworks, configuration centers, or generic abstraction layers without a current requirement.
- Every abstraction must solve a present problem.
- Use real financial data or show an explicit unavailable/error state; never present mock data as real.
- Keep API credentials server-side and out of Git.

### Product direction from the initial ChatGPT discussion

The broad concept is an A-share research workspace organized around Market → Theme → Stock. The earlier proposal suggested this MVP path:

1. Today's market
2. Theme radar
3. Theme detail
4. Stock 360
5. Watchlist
6. AI Copilot

This scope is being challenged and reduced to the smallest runnable loop before implementation.

### Pending design request

ChatGPT was asked to provide:

- A concrete first-version user story and minimum business loop.
- Explicit in-scope and out-of-scope items.
- The smallest justified technical stack.
- Pages, data flow, real-data requirements, error states, and data conventions.
- A phased task list with acceptance criteria.
- One small, independently verifiable first development task with file-level instructions.

No application code will be scaffolded until that first task is agreed.

## 2026-08-24 — V1 scope and Task 1

### Decision

The V1 business loop is Market → Industry → Stock. The phrase “theme radar” is deferred until multi-period strength and breadth evidence exists; V1 will initially describe same-day industry performance only.

### Architecture

- One Next.js application serves both the UI and server-side Hithink requests.
- No standalone BFF or internal API route is added for Task 1; the Server Component calls the server-only data function directly.
- No database, AI, DuckDB, Python service, component library, or chart dependency.
- `lib/hithink.ts` is the only data-access abstraction. It exists to keep the API key server-side and centralize the HTTP and business-envelope success checks.

### V1 task sequence

1. Verify real Hithink connectivity with the trading calendar.
2. Add major-market index snapshots.
3. Rank Hithink industries by same-day change.
4. Add industry composition and breadth.
5. Add the basic stock-detail page and close the first business loop.
6. Add forward-adjusted daily candlesticks and moving averages.
7. Add the 60-day maximum drawdown and 20-day average turnover derived metrics.
8. Complete loading, error, empty, non-trading-day, mobile, timestamp, and README checks.

### Task 1

Prove Browser → Next.js Server Component → Hithink trading-calendar API → Browser using real data. The page must show the latest trading day and upstream data timestamp, and show an explicit error without mock fallback when configuration or the upstream service is unavailable.

### Security

API keys remain in local `.env` and must not enter Git, browser output, logs, or documentation. Browser network traffic must not contain the Hithink API key because the upstream call is server-side.

### Task 1 verification

- `npm run build`: passed with Next.js 16.3.2 and TypeScript.
- Real Hithink calendar response: `code=0`, 242 trading days, latest trading day `2026-08-24`.
- The rendered page showed the same latest trading day and the API-provided data timestamp.
- A separate run with an empty `HITHINK_FINANCE_API_KEY` showed `CONFIG_MISSING` and did not fall back to mock data.
- The served HTML contained neither secret values nor the `X-api-key` header name.
- `.env` is ignored by Git. The only local secret match outside `.env` was inside the ignored Turbopack development cache, not tracked source or browser output.

### GitHub decision

The repository is public at <https://github.com/imherro/MyInvest20260824> so ChatGPT can review it without depending on private-repository authorization. This differs from the initial private-repository suggestion; the user explicitly chose public visibility. Secret scanning remains a required pre-push check.

## 2026-08-24 — Task 1 review and Task 2

### Task 1 review

ChatGPT inspected commit `673c1b4` and the complete Git tree from GitHub. Task 1 passed without blocking changes. The only low-priority observation was that `envelope.data === null` did not cover a schema-violating `undefined`; Task 2 changes it to `envelope.data == null` without adding a validation layer.

### Task 2 decision

The homepage adds only two major-index latest snapshots: 上证指数 (`000001.SH`) and 沪深300 (`000300.SH`). Industry data, charts, historical prices, auto-refresh, client components, internal API routes, databases, and new dependencies remain out of scope.

### Endpoint and live contract check

- Endpoint: `GET /api/a-share-index/prices/snapshot?thscodes=000001.SH,000300.SH`.
- Live business response: `code=0`, `item` count 2.
- Both requested `thscode` values were returned without substitution.
- The live response exposed `data.timestamp`, `data.total`, and item fields `thscode`, `ticker`, `last_price`, `price_change`, `price_change_ratio_pct`, `open_price`, `high_price`, `low_price`, `prev_price`, `volume`, and `turnover`.
- Task 2 consumes only `timestamp`, `thscode`, `last_price`, `price_change`, and `price_change_ratio_pct`.
- The index snapshot returned a finite millisecond `timestamp`; this was verified from the live endpoint before implementation.

### Task 2 verification

- `npm run build`: passed.
- Live page check: 上证指数 `3,882.01`, `-23.19`, `-0.59%`; 沪深300 `4,563.13`, `-55.77`, `-1.21%`.
- Every displayed price, change, and percentage matched the live API response; only thousands separators and two-decimal formatting differed.
- The page used the index snapshot's own timestamp and labeled it “指数行情时间”; the calendar timestamp remains separately labeled.
- A temporary nonexistent `thscode` produced an explicit upstream error (`code=1002`) and the unified error UI, with no `0`, `--`, `undefined`, `NaN`, or mock fallback. The valid code was restored before commit.
- Served HTML contained neither the upstream host nor the API header name, confirming that the browser did not call Hithink directly.
- Task 2 changed only `lib/hithink.ts`, `app/page.tsx`, `app/globals.css`, and this append-only log. It added no dependency.

### Task 2 conclusion

Task 2 passed local acceptance. The homepage now answers the first real market question—how the Shanghai Composite and CSI 300 latest snapshots are performing—without expanding into industry data or charts.

## 2026-08-24 — Task 2 review and Task 3

### Task 2 review

ChatGPT inspected the GitHub diff from `673c1b4` to `64c1b87` and passed Task 2 without a repair commit. The only low-priority observation was that per-item index fields needed runtime validation before using larger result sets for sorting; Task 3 adds the required inline checks without a validation dependency or abstraction.

### Task 3 product wording

The page uses “同花顺行业 · 最新涨跌”, not “主线雷达” or “行业综合强度”. Task 3 has only a single-day latest snapshot and therefore must not imply multi-period strength, acceleration, breadth, or a composite score.

### Industry API preflight

- Catalog endpoint: `GET /api/a-share-index/catalog/ths-index-list?tag=industry`.
- Catalog response: `code=0`, 320 items, zero duplicate codes.
- Snapshot endpoint: `GET /api/a-share-index/prices/snapshot?thscodes=...` using all 320 catalog codes in one request.
- Approximate request URL length: 3,267 characters.
- Snapshot response: `code=0`, 320 items.
- Requested and returned `thscode` sets were identical: zero missing and zero extra.
- One bulk request succeeded, so no batching or pagination code was added.
- Pre-implementation first place: 其他养殖 (`884277.TI`), `1550.535`, `+6.381658%`.
- Pre-implementation last place: 其他生物制品 (`884240.TI`), `6112.091`, `-5.037977%`.

### Task 3 verification

- `npm run build`: passed.
- Final page row count: 320; the displayed percentages were monotonically non-increasing.
- Raw/API spot checks matched the page for ranks 1, 2, 160, 161, and 320, including name, `thscode`, latest point, and percentage.
- Final first place: 其他养殖 (`884277.TI`), displayed `1,550.54`, `+6.38%`.
- Final last place: 其他生物制品 (`884240.TI`), displayed `6,112.09`, `-5.04%`.
- The industry time came from `industrySnapshots.timestamp` and was formatted in `Asia/Shanghai`.
- At a 390 × 844 viewport override, neither the document nor the table wrapper overflowed horizontally; all four columns remained present.
- Temporarily removing one returned snapshot produced `INDUSTRY_SNAPSHOT_INCOMPLETE`; the test change was restored.
- Temporarily injecting `Number.NaN` into a consumed snapshot field produced `INVALID_INDEX_SNAPSHOTS`; the test change was restored.
- Served HTML contained no secret, upstream host, or API header name. The private local watchlist remained Git-ignored and was not read by Task 3.
- No package or lock-file change, no mock data, and no new dependency.

### Task 3 conclusion

Task 3 passed local acceptance. The homepage now provides a complete real-data, single-day industry cross-section while explicitly avoiding unsupported “main theme” or composite-strength claims.

## 2026-08-24 — Task 3 review and Task 4

### Task 3 review

ChatGPT inspected commit `2883bdf` and passed Task 3 without a repair commit. It considered the direct catalog-to-snapshot lookup acceptable for the current 320-item dataset and explicitly deferred a map-based refactor or duplicate-catalog validation because neither solves a current problem.

### Task 4 decision

Task 4 adds the first drill-down from the homepage industry ranking to `/industry/[thscode]`. The dynamic route validates the URL code against the real `tag=industry` catalog, then shows the selected industry index, its current constituents, market breadth, and a constituent ranking by latest percentage change. It does not add stock links, historical data, charts, search, filters, a database, client-side fetching, or new dependencies.

The current-constituent list is authoritative. An empty list, a missing industry index snapshot, or any missing constituent stock snapshot produces an explicit error instead of silently filtering or substituting data. Index, constituent, and stock-snapshot payloads receive only the runtime validation needed for fields consumed by this page.

### Task 4 API preflight

- Test industry: 其他养殖 (`884277.TI`).
- Current constituents endpoint returned 3 nonempty records.
- All 3 constituent codes were sent to the A-share snapshot endpoint in one request; it returned 3 records, with zero missing and zero extra.
- The request URL was 95 characters, so no batching code was added.
- Although the offline stock-snapshot contract permits a null top-level timestamp for explicit-code mode, this live response returned a finite millisecond timestamp. The page therefore follows the reviewed Task 4 design and shows separate index and stock snapshot times.
- Live industry index values at verification: `1550.535`, `+6.381658%`.
- Live breadth: 1 advance, 2 declines, 0 flat, advance ratio `33.333333%`.

### Task 4 verification

- `npm run build`: passed with `/industry/[thscode]` rendered dynamically.
- The homepage industry name is a link; clicking 其他养殖 navigated to `/industry/884277.TI`.
- Detail-page industry code, index value, index percentage, constituent names/codes, prices, percentages, turnover values, and ordering matched the live API response.
- Constituent order was monotonically non-increasing: 天山生物 (`+20.00%`), `*ST福成` (`-0.36%`), 华英农业 (`-0.49%`). With three rows, these also cover first, second/middle, penultimate, and last rank checks.
- Displayed breadth summed to the 3 constituents, and the independently recomputed advance ratio formatted to `33.33%`.
- Index time and stock-snapshot time came from their separate source responses and were displayed independently.
- A temporary removal of one stock snapshot produced `CONSTITUENT_SNAPSHOT_INCOMPLETE`; the change was restored.
- A temporary `turnover: NaN` injection produced `INVALID_STOCK_SNAPSHOTS`; the change was restored.
- `/industry/XXXXXX.TI` produced `INDUSTRY_NOT_FOUND` after catalog validation.
- At 390 × 844, document, wrapper, and four-column table widths stayed within the viewport; all five breadth cards and all four table columns remained present, with long stock names protected by ellipsis.
- Served HTML contained no API secret, `X-api-key`, or upstream host, and no mock data was added.
- Dependencies and lock file remained unchanged.

### Public service binding added by the user

During Task 4 the user required the web service to listen on `0.0.0.0:8030` for an existing Cloudflare tunnel at <https://invest0830.okbbc.com>. This explicit user requirement overrides the original five-file Task 4 diff expectation, so `package.json` is the sixth changed file. Both `npm run dev` and `npm start` now use that host and port; no Cloudflare package, framework, or project configuration was added.

The listener was verified on `0.0.0.0:8030`. The external industry-detail URL returned HTTP 200 with the real industry and constituent content, while its HTML contained neither the API header name nor the upstream host.

## 2026-08-24 — Task 4 GitHub review repair

ChatGPT's GitHub review found one medium contract mismatch: the official A-share snapshot contract permits `data.timestamp` to be null in explicit `thscodes` mode. The live Task 4 response returned a finite timestamp, but the implementation must not depend on that observed behavior when the documented null value is also valid.

`StockSnapshots.timestamp` now accepts `number | null`. The data function accepts null or a finite number while still rejecting undefined, strings, `NaN`, and infinity. When the timestamp is null, the industry page keeps all real constituent data visible and labels the stock time as “接口未提供（显式代码模式）”; it does not substitute the current time, index time, or constituent time.

Repair verification covered both valid branches and invalid values. The current live API still returned a finite timestamp and the page displayed its real Asia/Shanghai time. A temporary null injection kept all three real constituents and breadth data visible while showing the explicit unavailable label. Temporary `NaN`, string, and undefined injections each produced `INVALID_STOCK_SNAPSHOTS`. Every injection was removed before the final build and commit.

## 2026-08-24 — Task 4 repair review and Task 5

### Task 4 repair review

ChatGPT compared `a607404..35177fe` from GitHub and formally passed Task 4. The repair commit changed only the three requested files, matched the official nullable timestamp contract, preserved truthful time semantics, and introduced no new issue.

### Task 5 scope

Task 5 closes the first Market → Industry → Stock business loop with a basic A-share latest-snapshot detail page. It adds no historical prices, candlesticks, moving averages, valuations, financials, database, client-side fetching, API route, formatter refactor, or dependency. Stock identity comes from an exact A-share meta-search match rather than from the referring industry page or a guessed exchange suffix.

### Task 5 API preflight

- Meta request: `GET /api/meta/tickers/search?q=300313.SZ&asset_type=a-share&limit=10`.
- Business response `code=0`; one candidate and one exact `thscode + asset_type` match: 天山生物 (`300313.SZ`, `a-share`).
- Snapshot request: `GET /api/a-share/prices/snapshot?thscodes=300313.SZ`.
- Business response `code=0`; exactly one item for `300313.SZ`.
- Pre-implementation fields: last `15.36`, change `+2.56`, percentage `+20%`, open `13.37`, high `15.36`, low `12.19`, previous close `12.80`, volume `46,366,631`, turnover `639,508,500`.
- The live snapshot returned a finite timestamp; the page also supports the documented null branch without substituting another time.

### Task 5 verification

- `npm run build`: passed; `/stock/[thscode]` is a dynamic Server Component route.
- Browser navigation passed from `/` to `/industry/884277.TI` to `/stock/300313.SZ`; only the stock name is linked.
- Page identity came from the exact meta result and matched 天山生物 (`300313.SZ`). All nine displayed snapshot fields matched the same preflight response, with only two-decimal and unit formatting differences.
- The finite timestamp displayed the real Asia/Shanghai time. A temporary null timestamp kept all stock facts visible and displayed “接口未提供（显式代码模式）”; the test change was restored.
- `/stock/000300.SH` and `/stock/XXXXXX.SZ` both produced `STOCK_NOT_FOUND`.
- Temporarily removing the exact snapshot produced `STOCK_SNAPSHOT_INCOMPLETE`; the test change was restored.
- Temporarily setting `open_price` to `NaN` produced `INVALID_STOCK_DETAIL_SNAPSHOT`; the test change was restored.
- At 390 × 844, document and body widths stayed within the viewport, the name and price remained readable, and all six fact cards were present without a table or horizontal scrolling.
- The production server listened on `0.0.0.0:8030`. <https://invest0830.okbbc.com/stock/300313.SZ> returned HTTP 200 with the real name, code, price, and volume label.
- Served public HTML contained neither `X-api-key` nor the upstream host. No mock fallback or dependency was added; `package.json` and `package-lock.json` remained unchanged.

## 2026-08-24 — Task 5 review and Task 6

### Task 5 GitHub review

ChatGPT compared `35177fe..83570d2` on GitHub and passed Task 5 without a repair commit. It confirmed the exact A-share identity match, the deliberately narrow shared snapshot validation, the stock-page-only detail validation, truthful nullable timestamp handling, navigation, mobile layout, and server-only secret boundary. The Market → Industry → Stock MVP loop is formally complete.

### Task 6 scope and implementation

Task 6 adds one real price-history view below the existing stock snapshot: at most 250 front-adjusted daily candlesticks, MA20/60/120 based on front-adjusted closes, and volume. It does not add drawdown, average turnover, indicators beyond those three moving averages, period or adjustment switches, a database, an API route, or client-side data fetching.

The server explicitly requests `interval=1d&adjust=forward` for an approximately 400-calendar-day window, validates the historical timestamp and every OHLCV/turnover number, sorts by `date_ms`, and retains the latest 250 bars. Moving averages are calculated on the server without rounding; values before a complete window remain null. The only Client Component receives serializable chart arrays and owns only the ECharts lifecycle.

### Task 6 API preflight

- Test stock: 天山生物 (`300313.SZ`), used only for acceptance and not hard-coded.
- Endpoint: `GET /api/a-share/prices/historical` with one `thscode`, millisecond `start/end`, `interval=1d`, and explicit `adjust=forward`.
- Business response: `code=0`, timestamp `1787500800000`, 266 raw bars.
- Raw first and last `date_ms`: `1753027200000` and `1787500800000`.
- Every returned `date_ms`, OHLC, volume, and turnover value was finite.

### Task 6 verification

- The page displayed 250 sorted bars, from `2025-08-12` through `2026-08-24`, with the latest bar matching the live response.
- Independent last-window calculations matched the values serialized to the chart within floating-point error: MA20 `9.766500000000002`, MA60 `8.784666666666665`, and MA120 `8.511083333333335`.
- The chart rendered one canvas with candlesticks, MA20/60/120, volume, tooltip/crosshair configuration, inside zoom, and a visible slider. Its canvas accepted browser interaction and resized from 680 × 520 desktop to 343 × 440 mobile.
- A temporary `close_price = NaN` injection produced `INVALID_STOCK_HISTORY`; a temporary empty item array produced `EMPTY_STOCK_HISTORY`; reversing the API array still produced 250 ascending dates. All injections were removed.
- At the 390 × 844 mobile viewport, body and document had no horizontal overflow, the chart stayed within the page, and the snapshot facts, title, history time, adjustment wording, and chart remained readable.
- `echarts` `6.1.0` is the sole new dependency; no React chart wrapper or second abstraction was added.
- `npm run build`: passed with the stock route remaining dynamically server-rendered.
- The final production server listened on `0.0.0.0:8030`. <https://invest0830.okbbc.com/stock/300313.SZ> returned HTTP 200, retained the live snapshot, contained the 250-bar chart payload, and rendered the chart in the browser.
- Public HTML contained neither `X-api-key` nor `fuyao.aicubes.cn`; the Client Component received only dates, OHLC tuples, volume, and moving-average arrays.

## 2026-08-24 — Task 6 review and Task 7

### Task 6 GitHub review

ChatGPT compared `83570d2..4ae84e7` on GitHub and passed Task 6 without a repair commit. It confirmed the exact historical endpoint contract, finite runtime checks, explicit front adjustment, sorting and 250-bar limit, moving-average semantics, narrow Client Component boundary, ECharts lifecycle, mobile layout, dependency lock, security boundary, and absence of unrelated features.

### Task 7 scope and implementation

Task 7 reuses the existing front-adjusted daily history and adds only two objective derived values: maximum drawdown over the latest 60 trading days, calculated from closes, and average turnover over the latest 20 trading days. The page does not label them as scores, signals, ratings, or advice. A small `lib/stock-metrics.ts` now contains the three pure calculations currently used by the page: moving average, maximum drawdown, and arithmetic average.

The historical response is sorted once. The chart still receives the latest 250 bars, while the research metrics use the latest 60 and 20 bars from the same sorted real response. Fewer than 60 or 20 bars produces “数据不足” for that metric without turning the stock page into an error state.

### Task 7 real-data preflight

- Test stock: 天山生物 (`300313.SZ`); 266 real front-adjusted daily bars, not hard-coded.
- Latest-60 window: `2026-05-29` through `2026-08-24`.
- Preceding peak used by the worst drawdown: close `9.66` on `2026-06-01`.
- Subsequent trough: close `7.40` on `2026-07-22`.
- Maximum drawdown: `7.40 / 9.66 - 1 = -0.23395445134575565`; page display `-23.40%`.
- Latest-20 window: `2026-07-28` through `2026-08-24`.
- Average turnover: `199050321.5325`, or `1.990503215325` hundred-million units; page display `1.99 亿`.

### Task 7 verification

- `npm test`: all four Node-native tests passed. Coverage includes complete-window moving averages, the valid peak-to-later-trough drawdown path, rising and flat zero-drawdown cases, and arithmetic average. No test dependency or framework was added.
- Temporarily retaining only 30 real bars kept the snapshot and chart visible, showed maximum drawdown as “数据不足”, and still calculated the 20-day average turnover. Retaining only 10 bars kept the page working and showed both metrics as “数据不足”. Both injections were removed.
- With the full response restored, the browser displayed `-23.40%`, `1.99 亿`, and 250 chart bars alongside the unchanged real stock snapshot.
- `npm run build`: passed; the stock route remains dynamically server-rendered. No dependency or lock-file change was needed.
- At 390 × 844, the two reused fact cards remained readable in two columns, the explanation wrapped normally, and the page and chart showed no visible horizontal overflow.
- The final production service remained on `0.0.0.0:8030`. <https://invest0830.okbbc.com/stock/300313.SZ> returned HTTP 200 and displayed both real research metrics with the existing snapshot and chart.

## 2026-08-24 — Task 7 review and Task 8 V1 close-out

### Task 7 GitHub review

ChatGPT compared `4ae84e7..749f0c3` on GitHub and passed Task 7 without a repair commit. It accepted the existing Node `MODULE_TYPELESS_PACKAGE_JSON` test warning and explicitly requested no package-type change or warning suppression.

### Task 8 implementation

The homepage now derives today's Shanghai calendar date and compares it with the existing real trading-calendar response. It displays either “今天是交易日” or “今天非交易日，展示最近可用行情” without changing any source timestamp. A minimal root `loading.tsx` supplies one shared navigation message while dynamic Server Component data loads. The README now describes only the delivered V1 features, real Hithink data boundary, local commands, `0.0.0.0:8030` deployment, public URL, and personal-research scope. No new dependency, data layer, client component, or CSS rule was added.

### Task 8 verification

- At the current Shanghai date `20260824`, the real calendar selected the trading-day branch and the latest trading day was also `20260824`. A temporary false-state simulation selected the non-trading-day wording while retaining all real indices, 320 industries, and their source times; the change was removed.
- Temporary two-second delays verified the shared loading view on navigation to `/` and `/stock/300313.SZ`; both delays were removed.
- Temporary checks produced `CONFIG_MISSING`, `STOCK_NOT_FOUND`, `INDUSTRY_NOT_FOUND`, and `EMPTY_STOCK_HISTORY` through their existing clean error states. No stack, mock fallback, or unrelated data appeared, and the route-level back links remained available where applicable. Every injection was removed.
- Source-time expressions remain mapped to their own calendar, index, industry, stock-snapshot, and stock-history responses. Browser checks confirmed each page still presents its corresponding source time; Task 8 adds no time substitution or overwrite.
- At 390 × 844, `/`, `/industry/884277.TI`, and `/stock/300313.SZ` remained readable with no visible horizontal overflow. The market state, industry breadth/table, stock snapshot/metrics, and chart title were present. No CSS change was required.
- `npm test`: all four tests passed with the previously accepted module warning unchanged. `npm run build`: passed; all data routes remain dynamically server-rendered.
- The production service was restarted on `0.0.0.0:8030`. The public home, industry, and stock URLs each returned HTTP 200 with real content. The live industry page showed 其他养殖 (`884277.TI`), its breadth, and three current constituents; the stock page showed 天山生物 (`300313.SZ`). No Cloudflare configuration change was needed.
- Public HTML contained neither `X-api-key` nor the upstream host. Tracked application files contained no API secret, no mock/fallback data was introduced, and the ignored private watchlist was not read or transmitted.

## 2026-08-24 — Task 8 final review and V1 freeze

ChatGPT used GitHub to compare `749f0c399a873741a21950be026b13e1bea4b4a1..01f5c7605e812ae9a55f6203ffa11e51e2229553` and formally passed Task 8. The review confirmed the strict four-file diff, Shanghai date calculation independent of server timezone, unchanged source timestamp boundaries, minimal Server Component loading UI, README consistency with port 8030, append-only development history, and server-only secret boundary.

Final disposition: V1 passed and is formally frozen at `01f5c7605e812ae9a55f6203ffa11e51e2229553`. Mandatory fixes: 0. High: 0; Medium: 0; Low: 0. No further development task or optional optimization was assigned.

## 2026-08-24 — V2 Task 1 自选股日常看板

V2 从最短的个人研究闭环开始：根路径现在直接显示本地自选清单的最新行情，原有市场与行业总览移动到 `/market`。清单由忽略的 `.local/watchlist.csv` 读取；实现只接受 `name,code,market,asset_type` 四列，逐行校验空字段、格式、空清单与重复代码。该文件不进入仓库；用户明确允许其标的字段在公开网页展示。

本次清单共 34 个标的：21 个 A 股由一次显式代码批量快照取得，12 个场内 ETF 分别请求并用 `Promise.allSettled` 隔离失败，1 个港股因当前数据源能力明确显示为不支持且不会请求上游。正常行按绝对涨跌幅排序；同幅时按有符号涨跌幅和代码稳定排序。A 股可进入已有股票详情页，ETF 与港股暂不虚构详情入口。

桌面端使用 1180px 的宽表作为主界面，显示排名、标的、最新价、涨跌幅、成交额和行情状态/时间；390px 窄屏隐藏成交额列并保持其余核心信息无水平溢出。行情时间只显示对应上游快照的真实时间；A 股显式代码模式没有时间时会直接标示“时间未提供”，不使用当前时间替代。

### V2 Task 1 verification

- 真实数据预检：A 股批量快照完整返回 21 个请求代码；12 个 ETF 请求均成功；港股未发起请求。所有正常行情字段和来源时间均为有限值。
- 浏览器宽屏检查（1440px）：页面宽 1180px、表格宽 1178px，无水平溢出；根页面显示 34 个标的、可用/不可用汇总、A 股详情链接、ETF 无详情链接和港股不支持状态。
- 浏览器窄屏检查（390 × 844）：成交额列按预期隐藏，页面与表格均无水平溢出，核心行情与状态仍可读。
- `npm test`：4 个既有 Node 原生测试通过；保留既有 `MODULE_TYPELESS_PACKAGE_JSON` 警告，不新增包类型或抑制配置。
- `npm run build`：通过；`/`、`/market`、`/industry/[thscode]`、`/stock/[thscode]` 均保持动态服务端渲染。

## 2026-08-24 — V2 Task 2 ETF research detail

V2 的第二个闭环只补足 ETF 的下钻研究：自选首页的场内 ETF 现在进入 `/etf/[thscode]`，而港股继续没有链接。该页面先从现有自选清单精确确认 `CN + fund-etf` 身份；非自选或 A 股代码返回 `ETF_NOT_IN_WATCHLIST`，没有新增元信息搜索或猜测代码后缀。

ETF 页面并行读取单 ETF 快照与约 400 个自然日窗口的 ETF 日线，按日期排序并保留最多 250 根。它复用现有 K 线组件和 `stock-metrics.ts` 的 MA20/60/120、近 60 日最大回撤与近 20 日平均成交额计算；没有复制图表或创建基金指标层。ETF 日线接口明确不传 `adjust`，页面也不使用“前复权”措辞。详情页局部验证 OHLC、前收和成交量，避免提高首页快照的失败门槛。

### V2 Task 2 API preflight

- ETF：`510500.SH`；快照业务码 `0`，精确返回 1 个匹配项，来源时间有限，详情所需价格、成交量和成交额均为有限值。
- 历史接口：`/api/fund/market/historical` 使用单一 `thscode`、`interval=1d` 和约 400 日的毫秒窗口；业务码 `0`、响应代码为 `510500.SH`、区间为 `1d`、267 根日线，首尾日期均有效，所有 OHLC/成交量/成交额均为有限值。
- 最终 ETF 历史请求不含 `adjust` 参数。

### V2 Task 2 verification

- `/etf/510500.SH` 浏览器页面显示自选 ETF 身份、快照摘要、六项行情事实、两个研究指标、最近 250 个交易日和真实绘制的 K 线画布；页面没有“前复权”字样。
- 首页的 `510500.SH` 名称链接到 `/etf/510500.SH`；港股名称不是链接。`/etf/600350.SH` 显示干净的 `ETF_NOT_IN_WATCHLIST` 错误状态。
- 390 × 844 下，首页和 ETF 详情页均无 document 横向溢出；ETF 图表宽度 343px 且保留核心内容。
- 既有 `/market` 在短暂网络失败后的重试中恢复真实主要指数和 320 个行业；`/stock/600350.SH` 仍显示股票详情和真实图表画布。
- `npm test`：既有 4 个 Node 原生测试通过，保留已经接受的模块类型警告。`npm run build`：通过，新增 `/etf/[thscode]` 动态路由。
