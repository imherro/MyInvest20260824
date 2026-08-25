import Link from "next/link";

import {
  getFundDailyHistory,
  getFundMarketSnapshot,
  HithinkError,
} from "../../../lib/hithink";
import {
  calculateAverage,
  calculateMaxDrawdown,
  calculateMovingAverage,
} from "../../../lib/stock-metrics";
import { readWatchlist } from "../../../lib/watchlist";
import ResearchNotes from "../../components/ResearchNotes";
import StockKlineChart from "../../stock/[thscode]/StockKlineChart";

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

function formatShanghaiDate(timestamp: number): string {
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
  return `${values.year}-${values.month}-${values.day}`;
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

export default async function EtfDetail({
  params,
}: {
  params: Promise<{ thscode: string }>;
}) {
  try {
    const { thscode } = await params;
    const entries = await readWatchlist();
    const entry = entries.find(
      (item) =>
        item.code === thscode &&
        item.market === "CN" &&
        item.assetType === "fund-etf",
    );

    if (!entry) {
      throw new HithinkError(
        `未找到自选 ETF（${thscode}）。`,
        "ETF_NOT_IN_WATCHLIST",
      );
    }

    const end = Date.now();
    const start = end - 400 * DAY_MS;
    const [snapshots, history] = await Promise.all([
      getFundMarketSnapshot(entry.code),
      getFundDailyHistory(entry.code, start, end),
    ]);
    const snapshot = snapshots.item.find((item) => item.thscode === entry.code);

    if (!snapshot) {
      throw new HithinkError(
        `ETF 快照缺少 ${entry.name}（${entry.code}）。`,
        "ETF_SNAPSHOT_INCOMPLETE",
      );
    }
    if (
      !Number.isFinite(snapshot.open_price) ||
      !Number.isFinite(snapshot.high_price) ||
      !Number.isFinite(snapshot.low_price) ||
      !Number.isFinite(snapshot.prev_price) ||
      !Number.isFinite(snapshot.volume)
    ) {
      throw new HithinkError(
        "ETF 详情快照响应格式不正确。",
        "INVALID_ETF_DETAIL_SNAPSHOT",
      );
    }

    const sortedHistory = [...history.item].sort(
      (a, b) => a.date_ms - b.date_ms,
    );
    const bars = sortedHistory.slice(-250);
    const maxDrawdown60 =
      sortedHistory.length >= 60
        ? calculateMaxDrawdown(sortedHistory.slice(-60).map((bar) => bar.close_price))
        : null;
    const averageTurnover20 =
      sortedHistory.length >= 20
        ? calculateAverage(sortedHistory.slice(-20).map((bar) => bar.turnover))
        : null;
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

    return (
      <main className="asset-detail-page">
        <Link className="back-link" href="/">
          ← 返回首页
        </Link>
        <header className="detail-header">
          <div>
            <h1 className="detail-title">{entry.name}</h1>
            <span className="label">{entry.code} · ETF</span>
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
          <span className="label">行情时间 {formatShanghaiTime(snapshots.timestamp)}</span>
        </section>
        <section className="stock-facts" aria-label="行情事实">
          <div className="stock-fact"><span className="label">今开</span><strong>{formatNumber(snapshot.open_price)}</strong></div>
          <div className="stock-fact"><span className="label">最高</span><strong>{formatNumber(snapshot.high_price)}</strong></div>
          <div className="stock-fact"><span className="label">最低</span><strong>{formatNumber(snapshot.low_price)}</strong></div>
          <div className="stock-fact"><span className="label">前收</span><strong>{formatNumber(snapshot.prev_price)}</strong></div>
          <div className="stock-fact"><span className="label">成交量</span><strong>{formatNumber(snapshot.volume / 10_000)} 万份</strong></div>
          <div className="stock-fact"><span className="label">成交额</span><strong>{formatNumber(snapshot.turnover / 100_000_000)} 亿</strong></div>
        </section>
        <section className="stock-history-section" aria-labelledby="etf-metrics-title">
          <div className="section-heading"><h2 id="etf-metrics-title">研究指标</h2></div>
          <div className="stock-metrics">
            <div className="stock-fact"><span className="label">近60日最大回撤</span><strong>{maxDrawdown60 === null ? "数据不足" : `${formatNumber(maxDrawdown60 * 100)}%`}</strong></div>
            <div className="stock-fact"><span className="label">近20日平均成交额</span><strong>{averageTurnover20 === null ? "数据不足" : `${formatNumber(averageTurnover20 / 100_000_000)} 亿`}</strong></div>
          </div>
          <p className="scope-note">最大回撤按最近60个交易日收盘价计算；平均成交额按最近20个交易日计算。</p>
        </section>
        <ResearchNotes assetCode={entry.code} assetType="fund-etf" />
        <section className="stock-history-section" aria-labelledby="etf-history-title">
          <div className="section-heading"><h2 id="etf-history-title">ETF 日线</h2><span className="label">最近 {bars.length} 个交易日</span></div>
          <p className="scope-note">历史数据时间 {formatShanghaiTime(history.timestamp)}</p>
          <StockKlineChart
            dates={dates}
            candles={candles}
            volumes={volumes}
            ma20={calculateMovingAverage(closes, 20)}
            ma60={calculateMovingAverage(closes, 60)}
            ma120={calculateMovingAverage(closes, 120)}
            ariaLabel="ETF 日 K、MA20、MA60、MA120 与成交量图表"
          />
          <p className="scope-note">ETF 交易所日线；当前接口不提供复权参数。MA20/60/120 按收盘价计算。</p>
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
      <main className="asset-detail-page">
        <Link className="back-link" href="/">← 返回首页</Link>
        <section className="panel error" role="alert">
          <h1 className="error-title">ETF 数据暂不可用</h1>
          <p className="error-details">
            {hithinkError.message}
            {hithinkError.code ? <><br />错误代码：{hithinkError.code}</> : null}
            {hithinkError.requestId ? <><br />request_id：{hithinkError.requestId}</> : null}
          </p>
        </section>
        <footer>未使用模拟数据。</footer>
      </main>
    );
  }
}
