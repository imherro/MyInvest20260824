import Link from "next/link";

import {
  getIndexConstituents,
  getIndexSnapshots,
  getIndustryIndices,
  getStockSnapshots,
  HithinkError,
} from "../../../lib/hithink";

export const dynamic = "force-dynamic";

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

function formatChange(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}%`;
}

function changeClass(value: number): string {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export default async function IndustryDetail({
  params,
}: {
  params: Promise<{ thscode: string }>;
}) {
  try {
    const { thscode } = await params;
    const catalog = await getIndustryIndices();
    const industry = catalog.item.find((item) => item.thscode === thscode);

    if (!industry) {
      throw new HithinkError(
        `未找到同花顺行业（${thscode}）。`,
        "INDUSTRY_NOT_FOUND",
      );
    }

    const [indexSnapshots, constituents] = await Promise.all([
      getIndexSnapshots([industry.thscode]),
      getIndexConstituents(industry.thscode),
    ]);
    const indexSnapshot = indexSnapshots.item.find(
      (item) => item.thscode === industry.thscode,
    );

    if (!indexSnapshot) {
      throw new HithinkError(
        `行业指数快照缺少 ${industry.name}（${industry.thscode}）。`,
        "INDUSTRY_INDEX_SNAPSHOT_INCOMPLETE",
      );
    }

    if (constituents.item.length === 0) {
      throw new HithinkError(
        `${industry.name} 当前没有成分股数据。`,
        "EMPTY_INDUSTRY_CONSTITUENTS",
      );
    }

    const stockSnapshots = await getStockSnapshots(
      constituents.item.map((item) => item.thscode),
    );
    const stocks = constituents.item
      .map((constituent) => {
        const snapshot = stockSnapshots.item.find(
          (item) => item.thscode === constituent.thscode,
        );

        if (!snapshot) {
          throw new HithinkError(
            `成分股快照缺少 ${constituent.name}（${constituent.thscode}）。`,
            "CONSTITUENT_SNAPSHOT_INCOMPLETE",
          );
        }

        return { ...constituent, snapshot };
      })
      .sort(
        (a, b) =>
          b.snapshot.price_change_ratio_pct -
          a.snapshot.price_change_ratio_pct,
      );
    const advance = stocks.filter(
      ({ snapshot }) => snapshot.price_change_ratio_pct > 0,
    ).length;
    const decline = stocks.filter(
      ({ snapshot }) => snapshot.price_change_ratio_pct < 0,
    ).length;
    const flat = stocks.length - advance - decline;
    const advanceRatio = (advance / stocks.length) * 100;

    return (
      <main>
        <Link className="back-link" href="/">
          ← 返回市场
        </Link>
        <header className="detail-header">
          <div>
            <h1 className="detail-title">{industry.name}</h1>
            <span className="label">{industry.thscode}</span>
          </div>
          <div className="detail-index">
            <strong>{formatNumber(indexSnapshot.last_price)}</strong>
            <span className={changeClass(indexSnapshot.price_change_ratio_pct)}>
              {formatChange(indexSnapshot.price_change_ratio_pct)}
            </span>
          </div>
        </header>
        <section className="detail-times" aria-label="数据时间">
          <span className="label">
            行业指数时间 {formatShanghaiTime(indexSnapshots.timestamp)}
          </span>
          <span className="label">
            成分股行情时间{" "}
            {stockSnapshots.timestamp === null
              ? "接口未提供（显式代码模式）"
              : formatShanghaiTime(stockSnapshots.timestamp)}
          </span>
        </section>
        <section className="breadth-grid" aria-label="成分股涨跌分布">
          <div className="breadth-card">
            <span className="label">成分股</span>
            <strong>{stocks.length}</strong>
          </div>
          <div className="breadth-card">
            <span className="label">上涨</span>
            <strong className="positive">{advance}</strong>
          </div>
          <div className="breadth-card">
            <span className="label">下跌</span>
            <strong className="negative">{decline}</strong>
          </div>
          <div className="breadth-card">
            <span className="label">平盘</span>
            <strong className="neutral">{flat}</strong>
          </div>
          <div className="breadth-card">
            <span className="label">上涨占比</span>
            <strong>{formatNumber(advanceRatio)}%</strong>
          </div>
        </section>
        <section className="market-section" aria-labelledby="constituents-title">
          <div className="section-heading">
            <h2 id="constituents-title">成分股 · 最新涨跌</h2>
            <span className="label">共 {stocks.length} 只</span>
          </div>
          <div className="industry-table-wrapper">
            <table className="stock-table">
              <thead>
                <tr>
                  <th scope="col">股票</th>
                  <th scope="col">最新价</th>
                  <th scope="col">涨跌幅</th>
                  <th scope="col">成交额（亿）</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(({ thscode: stockCode, name, snapshot }) => (
                  <tr key={stockCode}>
                    <td className="stock-name">
                      <Link className="stock-link" href={`/stock/${stockCode}`}>
                        {name}
                      </Link>
                      <span className="label">{stockCode}</span>
                    </td>
                    <td>{formatNumber(snapshot.last_price)}</td>
                    <td className={changeClass(snapshot.price_change_ratio_pct)}>
                      {formatChange(snapshot.price_change_ratio_pct)}
                    </td>
                    <td>{formatNumber(snapshot.turnover / 100_000_000)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="scope-note">
            成分股为当前成分，不代表历史成分；行情为最新快照。
          </p>
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
        <Link className="back-link" href="/">
          ← 返回市场
        </Link>
        <section className="panel error" role="alert">
          <h1 className="error-title">行业数据暂不可用</h1>
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
