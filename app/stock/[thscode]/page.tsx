import Link from "next/link";

import {
  getAshareTicker,
  getForwardAdjustedDailyHistory,
  getStockSnapshots,
  HithinkError,
} from "../../../lib/hithink";
import StockKlineChart from "./StockKlineChart";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

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

function formatShanghaiDate(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function calculateMA(
  values: readonly number[],
  window: number,
): (number | null)[] {
  let sum = 0;

  return values.map((value, index) => {
    sum += value;
    if (index >= window) sum -= values[index - window];
    return index >= window - 1 ? sum / window : null;
  });
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

    const end = Date.now();
    const start = end - 400 * DAY_MS;
    const [snapshots, history] = await Promise.all([
      getStockSnapshots([ticker.thscode]),
      getForwardAdjustedDailyHistory(ticker.thscode, start, end),
    ]);
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

    const bars = [...history.item]
      .sort((a, b) => a.date_ms - b.date_ms)
      .slice(-250);
    const dates = bars.map((bar) => formatShanghaiDate(bar.date_ms));
    const candles = bars.map(
      (bar) =>
        [bar.open_price, bar.close_price, bar.low_price, bar.high_price] as [
          number,
          number,
          number,
          number,
        ],
    );
    const volumes = bars.map((bar) => bar.volume);
    const closes = bars.map((bar) => bar.close_price);
    const ma20 = calculateMA(closes, 20);
    const ma60 = calculateMA(closes, 60);
    const ma120 = calculateMA(closes, 120);

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
        <section
          className="stock-history-section"
          aria-labelledby="stock-history-title"
        >
          <div className="section-heading">
            <h2 id="stock-history-title">前复权日线</h2>
            <span className="label">最近 {bars.length} 个交易日</span>
          </div>
          <p className="scope-note">
            历史数据时间 {formatShanghaiTime(history.timestamp)}
          </p>
          <StockKlineChart
            dates={dates}
            candles={candles}
            volumes={volumes}
            ma20={ma20}
            ma60={ma60}
            ma120={ma120}
          />
          <p className="scope-note">
            前复权 · 日线。MA20/60/120 均按前复权收盘价计算。
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
