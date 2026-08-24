import { getTradingDays, HithinkError } from "../lib/hithink";

export const dynamic = "force-dynamic";

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

export default async function Home() {
  try {
    const calendar = await getTradingDays();
    const latestTradingDay = calendar.item.at(-1);

    if (!latestTradingDay) {
      throw new HithinkError("当前条件暂无交易日数据。", "EMPTY_CALENDAR");
    }

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
            <span className="label">数据更新时间（Asia/Shanghai）</span>
            <span className="value">{formatShanghaiTime(calendar.timestamp)}</span>
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
