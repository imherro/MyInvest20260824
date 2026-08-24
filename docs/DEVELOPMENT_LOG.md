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
