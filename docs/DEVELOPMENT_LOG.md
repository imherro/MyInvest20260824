# Development Log

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
