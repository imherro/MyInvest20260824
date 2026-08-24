import Link from "next/link";

import {
  getIndexSnapshots,
  getIndustryIndices,
  getTradingDays,
  HithinkError,
} from "../../lib/hithink";

export const dynamic = "force-dynamic";

const MAJOR_INDICES = [
  { thscode: "000001.SH", name: "上证指数" },
  { thscode: "000300.SH", name: "沪深300" },
] as const;

function formatTradingDate(value: string): string {
  return /^\d{8}$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value;
}

function formatShanghaiDateCode(timestamp: number): string {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}${values.month}${values.day}`;
}

function formatShanghaiTime(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(value: number, suffix = ""): string {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}${suffix}`;
}

function changeClass(value: number): string {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export default async function MarketPage() {
  try {
    const [calendar, indexSnapshots, industryCatalog] = await Promise.all([
      getTradingDays(),
      getIndexSnapshots(MAJOR_INDICES.map((index) => index.thscode)),
      getIndustryIndices(),
    ]);
    const industrySnapshots = await getIndexSnapshots(
      industryCatalog.item.map((industry) => industry.thscode),
    );
    const latestTradingDay = calendar.item.at(-1);
    const isTradingDayToday = calendar.item.some(
      (day) => day.date === formatShanghaiDateCode(Date.now()),
    );

    if (!latestTradingDay) {
      throw new HithinkError("当前条件暂无交易日数据。", "EMPTY_CALENDAR");
    }

    const indices = MAJOR_INDICES.map((index) => {
      const snapshot = indexSnapshots.item.find(
        (item) => item.thscode === index.thscode,
      );
      if (!snapshot) {
        throw new HithinkError(
          `指数快照缺少 ${index.name}（${index.thscode}）。`,
          "INDEX_SNAPSHOT_INCOMPLETE",
        );
      }
      return { ...index, snapshot };
    });
    const industries = industryCatalog.item
      .map((industry) => {
        const snapshot = industrySnapshots.item.find(
          (item) => item.thscode === industry.thscode,
        );
        if (!snapshot) {
          throw new HithinkError(
            `行业快照缺少 ${industry.name}（${industry.thscode}）。`,
            "INDUSTRY_SNAPSHOT_INCOMPLETE",
          );
        }
        return { ...industry, snapshot };
      })
      .sort(
        (a, b) =>
          b.snapshot.price_change_ratio_pct -
          a.snapshot.price_change_ratio_pct,
      );

    return (
      <main>
        <Link className="back-link" href="/">
          ← 返回自选
        </Link>
        <h1>市场研究</h1>
        <p className="subtitle">A 股市场与行业最新概览</p>
        <section className="panel" aria-label="数据状态">
          <div className="fact"><span className="label">数据源</span><span className="value">同花顺金融数据 API</span></div>
          <div className="fact"><span className="label">市场状态</span><span className="value">{isTradingDayToday ? "今天是交易日" : "今天非交易日，展示最近可用行情"}</span></div>
          <div className="fact"><span className="label">最近交易日</span><span className="value">{formatTradingDate(latestTradingDay.date)}</span></div>
          <div className="fact"><span className="label">交易日历更新时间（Asia/Shanghai）</span><span className="value">{formatShanghaiTime(calendar.timestamp)}</span></div>
        </section>
        <section className="market-section" aria-labelledby="major-indices-title">
          <div className="section-heading"><h2 id="major-indices-title">主要指数 · 最新快照</h2><span className="label">指数行情时间 {formatShanghaiTime(indexSnapshots.timestamp)}</span></div>
          <div className="indices">{indices.map(({ name, thscode, snapshot }) => <article className="index-card" key={thscode}><div><h3>{name}</h3><span className="label">{thscode}</span></div><strong className="index-price">{formatNumber(snapshot.last_price)}</strong><div className={`change ${changeClass(snapshot.price_change)}`}><span>{formatChange(snapshot.price_change)}</span><span>{formatChange(snapshot.price_change_ratio_pct, "%")}</span></div></article>)}</div>
        </section>
        <section className="market-section" aria-labelledby="industry-title">
          <div className="section-heading"><div><h2 id="industry-title">同花顺行业 · 最新涨跌</h2><span className="label">共 {industries.length} 个行业</span></div><span className="label">行业行情时间 {formatShanghaiTime(industrySnapshots.timestamp)}</span></div>
          <div className="industry-table-wrapper"><table className="industry-table"><thead><tr><th scope="col">排名</th><th scope="col">行业</th><th scope="col">最新点位</th><th scope="col">涨跌幅</th></tr></thead><tbody>{industries.map(({ thscode, name, snapshot }, index) => <tr key={thscode}><td className="industry-rank">{index + 1}</td><td className="industry-name"><Link href={`/industry/${thscode}`}>{name}</Link></td><td>{formatNumber(snapshot.last_price)}</td><td className={changeClass(snapshot.price_change_ratio_pct)}>{formatChange(snapshot.price_change_ratio_pct, "%")}</td></tr>)}</tbody></table></div>
          <p className="scope-note">按最新涨跌幅降序排列，仅反映单日行业指数表现，不代表中期主线。</p>
        </section>
        <footer>数据仅供个人研究，不构成投资建议。</footer>
      </main>
    );
  } catch (error) {
    const hithinkError = error instanceof HithinkError ? error : new HithinkError("同花顺金融数据服务请求失败。", "UNKNOWN_ERROR");
    return <main><Link className="back-link" href="/">← 返回自选</Link><h1>市场研究</h1><section className="panel error" role="alert"><h2 className="error-title">数据暂不可用</h2><p className="error-details">{hithinkError.message}{hithinkError.code ? <><br />错误代码：{hithinkError.code}</> : null}{hithinkError.requestId ? <><br />request_id：{hithinkError.requestId}</> : null}</p></section><footer>未使用模拟数据。</footer></main>;
  }
}
