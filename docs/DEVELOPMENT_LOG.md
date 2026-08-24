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
