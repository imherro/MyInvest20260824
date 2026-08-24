import Link from "next/link";

import {
  getAshareTicker,
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

function formatChange(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}${suffix}`;
}

function changeClass(value: number): string {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export default async function StockDetail({
  params,
}: {
  params: Promise<{ thscode: string }>;
}) {
  try {
    const { thscode } = await params;
    const ticker = await getAshareTicker(thscode);

    if (!ticker) {
      throw new HithinkError(`未找到 A 股股票（${thscode}）。`, "STOCK_NOT_FOUND");
    }

    const snapshots = await getStockSnapshots([ticker.thscode]);
    const snapshot = snapshots.item.find(
      (item) => item.thscode === ticker.thscode,
    );

    if (!snapshot) {
      throw new HithinkError(
        `股票快照缺少 ${ticker.name}（${ticker.thscode}）。`,
        "STOCK_SNAPSHOT_INCOMPLETE",
      );
    }
    if (
      !Number.isFinite(snapshot.price_change) ||
      !Number.isFinite(snapshot.open_price) ||
      !Number.isFinite(snapshot.high_price) ||
      !Number.isFinite(snapshot.low_price) ||
      !Number.isFinite(snapshot.prev_price) ||
      !Number.isFinite(snapshot.volume)
    ) {
      throw new HithinkError(
        "股票详情快照响应格式不正确。",
        "INVALID_STOCK_DETAIL_SNAPSHOT",
      );
    }

    return (
      <main>
        <Link className="back-link" href="/">
          ← 返回市场
        </Link>
        <header className="detail-header">
          <div>
            <h1 className="detail-title">{ticker.name}</h1>
            <span className="label">{ticker.thscode}</span>
          </div>
          <div className="stock-price-summary">
            <strong>{formatNumber(snapshot.last_price)}</strong>
            <div className={changeClass(snapshot.price_change_ratio_pct)}>
              <span>{formatChange(snapshot.price_change)}</span>
              <span>{formatChange(snapshot.price_change_ratio_pct, "%")}</span>
            </div>
          </div>
        </header>
        <section className="detail-times" aria-label="数据时间">
          <span className="label">
            行情时间{" "}
            {snapshots.timestamp === null
              ? "接口未提供（显式代码模式）"
              : formatShanghaiTime(snapshots.timestamp)}
          </span>
        </section>
        <section className="stock-facts" aria-label="行情事实">
          <div className="stock-fact">
            <span className="label">今开</span>
            <strong>{formatNumber(snapshot.open_price)}</strong>
          </div>
          <div className="stock-fact">
            <span className="label">最高</span>
            <strong>{formatNumber(snapshot.high_price)}</strong>
          </div>
          <div className="stock-fact">
            <span className="label">最低</span>
            <strong>{formatNumber(snapshot.low_price)}</strong>
          </div>
          <div className="stock-fact">
            <span className="label">前收</span>
            <strong>{formatNumber(snapshot.prev_price)}</strong>
          </div>
          <div className="stock-fact">
            <span className="label">成交量</span>
            <strong>{formatNumber(snapshot.volume / 10_000)} 万股</strong>
          </div>
          <div className="stock-fact">
            <span className="label">成交额</span>
            <strong>{formatNumber(snapshot.turnover / 100_000_000)} 亿</strong>
          </div>
        </section>
        <p className="scope-note stock-scope-note">
          最新行情快照，仅反映当前行情状态；历史走势将在后续研究页面提供。
        </p>
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
          <h1 className="error-title">股票数据暂不可用</h1>
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
