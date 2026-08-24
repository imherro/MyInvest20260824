import {
  getIndexSnapshots,
  getTradingDays,
  HithinkError,
} from "../lib/hithink";

export const dynamic = "force-dynamic";

const MAJOR_INDICES = [
  { thscode: "000001.SH", name: "上证指数" },
  { thscode: "000300.SH", name: "沪深300" },
] as const;

function formatTradingDate(value: string): string {
  if (!/^\d{8}$/.test(value)) {
    return value;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
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
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}${suffix}`;
}

function changeClass(value: number): string {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export default async function Home() {
  try {
    const [calendar, indexSnapshots] = await Promise.all([
      getTradingDays(),
      getIndexSnapshots(MAJOR_INDICES.map((index) => index.thscode)),
    ]);
    const latestTradingDay = calendar.item.at(-1);

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

    return (
      <main>
        <h1>MyInvest</h1>
        <p className="subtitle">A 股研究工具</p>
        <section className="panel" aria-label="数据状态">
          <div className="fact">
            <span className="label">数据源</span>
            <span className="value">同花顺金融数据 API</span>
          </div>
          <div className="fact">
            <span className="label">最近交易日</span>
            <span className="value">{formatTradingDate(latestTradingDay.date)}</span>
          </div>
          <div className="fact">
            <span className="label">交易日历更新时间（Asia/Shanghai）</span>
            <span className="value">{formatShanghaiTime(calendar.timestamp)}</span>
          </div>
        </section>
        <section className="market-section" aria-labelledby="major-indices-title">
          <div className="section-heading">
            <h2 id="major-indices-title">主要指数 · 最新快照</h2>
            <span className="label">
              指数行情时间 {formatShanghaiTime(indexSnapshots.timestamp)}
            </span>
          </div>
          <div className="indices">
            {indices.map(({ name, thscode, snapshot }) => (
              <article className="index-card" key={thscode}>
                <div>
                  <h3>{name}</h3>
                  <span className="label">{thscode}</span>
                </div>
                <strong className="index-price">
                  {formatNumber(snapshot.last_price)}
                </strong>
                <div className={`change ${changeClass(snapshot.price_change)}`}>
                  <span>{formatChange(snapshot.price_change)}</span>
                  <span>
                    {formatChange(snapshot.price_change_ratio_pct, "%")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <footer>数据仅供个人研究，不构成投资建议。</footer>
      </main>
    );
  } catch (error) {
    const hithinkError =
      error instanceof HithinkError
        ? error
        : new HithinkError("同花顺金融数据服务请求失败。", "UNKNOWN_ERROR");

    return (
      <main>
        <h1>MyInvest</h1>
        <p className="subtitle">A 股研究工具</p>
        <section className="panel error" role="alert">
          <h2 className="error-title">数据暂不可用</h2>
          <p className="error-details">
            {hithinkError.message}
            {hithinkError.code ? (
              <>
                <br />错误代码：{hithinkError.code}
              </>
            ) : null}
            {hithinkError.requestId ? (
              <>
                <br />request_id：{hithinkError.requestId}
              </>
            ) : null}
          </p>
        </section>
        <footer>未使用模拟数据。</footer>
      </main>
    );
  }
}
