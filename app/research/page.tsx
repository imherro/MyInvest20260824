import Link from "next/link";

import { listResearchNotes } from "../../lib/research-db";

export const dynamic = "force-dynamic";

const fields = [
  { key: "reason", label: "为何关注" },
  { key: "observation", label: "观察点" },
  { key: "plan", label: "计划" },
  { key: "risk", label: "风险点" },
] as const;

function formatShanghaiTime(timestamp: number): string {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

export default async function ResearchPage() {
  try {
    const notes = await listResearchNotes();

    return (
      <main className="research-page">
        <nav className="channel-nav" aria-label="研究频道导航">
          <Link className="back-link" href="/">← 返回自选</Link>
          <Link className="back-link" href="/market">市场 / 行业</Link>
        </nav>
        <h1>研究记录</h1>
        <p className="subtitle">全部共享研究记录</p>
        {notes.length === 0 ? (
          <p className="scope-note">暂无研究记录</p>
        ) : (
          <div className="research-list">
            {notes.map((note) => {
              const href = note.assetType === "a-share"
                ? `/stock/${note.assetCode}`
                : `/etf/${note.assetCode}`;
              const assetLabel = note.assetType === "a-share" ? "A股" : "ETF";

              return (
                <article className="research-item" key={note.id}>
                  <div className="research-item-meta">
                    <strong>{note.assetCode} · {assetLabel}</strong>
                    <time dateTime={new Date(note.createdAt).toISOString()}>
                      {formatShanghaiTime(note.createdAt)}
                    </time>
                  </div>
                  {fields.map(({ key, label }) =>
                    note[key] ? (
                      <div className="research-note-content" key={key}>
                        <strong>{label}</strong>
                        <p>{note[key]}</p>
                      </div>
                    ) : null,
                  )}
                  <Link className="market-link" href={href}>
                    进入标的详情 →
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
    );
  } catch {
    return (
      <main className="research-page">
        <nav className="channel-nav" aria-label="研究频道导航">
          <Link className="back-link" href="/">← 返回自选</Link>
          <Link className="back-link" href="/market">市场 / 行业</Link>
        </nav>
        <h1>研究记录</h1>
        <p className="research-note-error" role="alert">研究记录暂不可读取</p>
      </main>
    );
  }
}
