import Link from "next/link";

import {
  getForwardAdjustedDailyHistory,
  getFundDailyHistory,
  getFundMarketSnapshot,
  getStockSnapshots,
  HithinkError,
} from "../lib/hithink";
import {
  calculateLatestToPreviousAverage,
  calculatePeriodReturn,
} from "../lib/stock-metrics";
import { readWatchlist, type WatchlistEntry } from "../lib/watchlist";

export const dynamic = "force-dynamic";

type RowStatus = "ok" | "missing" | "error" | "unsupported";

type WatchlistRow = WatchlistEntry & {
  status: RowStatus;
  lastPrice?: number;
  changePct?: number;
  turnover?: number;
  timestamp?: number | null;
  errorCode?: string;
};

type FocusRow = WatchlistRow & {
  period5: number | null;
  period20: number | null;
  turnoverRatio: number | null;
  historyAvailable: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(value: number): string {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}%`;
}

function formatShanghaiTime(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

function changeClass(value: number): string {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function statusText(row: WatchlistRow): string {
  if (row.status === "unsupported") {
    return "暂不支持 · 当前数据源不支持港股";
  }
  if (row.status === "missing") return "行情缺失";
  if (row.status === "error") {
    return `行情暂不可用${row.errorCode ? ` · ${row.errorCode}` : ""}`;
  }
  return row.timestamp === null
    ? "行情可用 · 时间未提供（显式代码模式）"
    : `行情可用 · ${formatShanghaiTime(row.timestamp!)}`;
}

function assetLabel(entry: WatchlistEntry): string {
  if (entry.market === "CN" && entry.assetType === "a-share") return "A股";
  if (entry.market === "CN" && entry.assetType === "fund-etf") return "ETF";
  if (entry.market === "HK" && entry.assetType === "hk-stock") return "港股";
  return entry.assetType;
}

function errorCode(error: unknown): string | undefined {
  return error instanceof HithinkError ? error.code : "UNKNOWN_ERROR";
}

function FocusName({ row }: { row: WatchlistRow }) {
  if (row.market === "CN" && row.assetType === "a-share") {
    return <Link className="stock-link" href={`/stock/${row.code}`}>{row.name}</Link>;
  }
  return <Link className="stock-link" href={`/etf/${row.code}`}>{row.name}</Link>;
}

export default async function Home() {
  try {
    const entries = await readWatchlist();
    const aShares = entries.filter(
      (entry) => entry.market === "CN" && entry.assetType === "a-share",
    );
    const etfs = entries.filter(
      (entry) => entry.market === "CN" && entry.assetType === "fund-etf",
    );
    const [aShareResult, etfResults] = await Promise.all([
      aShares.length === 0
        ? Promise.resolve({ data: null, error: null as unknown })
        : getStockSnapshots(aShares.map((entry) => entry.code))
            .then((data) => ({ data, error: null as unknown }))
            .catch((error: unknown) => ({ data: null, error })),
      Promise.allSettled(etfs.map((entry) => getFundMarketSnapshot(entry.code))),
    ]);
    const etfResultsByCode = new Map(
      etfs.map((entry, index) => [entry.code, etfResults[index]]),
    );
    const rows: WatchlistRow[] = entries.map((entry) => {
      if (entry.market === "CN" && entry.assetType === "a-share") {
        if (aShareResult.error) {
          return {
            ...entry,
            status: "error",
            errorCode: errorCode(aShareResult.error),
          };
        }
        const snapshot = aShareResult.data?.item.find(
          (item) => item.thscode === entry.code,
        );
        if (!snapshot) return { ...entry, status: "missing" };
        return {
          ...entry,
          status: "ok",
          lastPrice: snapshot.last_price,
          changePct: snapshot.price_change_ratio_pct,
          turnover: snapshot.turnover,
          timestamp: aShareResult.data?.timestamp,
        };
      }

      if (entry.market === "CN" && entry.assetType === "fund-etf") {
        const result = etfResultsByCode.get(entry.code);
        if (!result || result.status === "rejected") {
          return {
            ...entry,
            status: "error",
            errorCode:
              result?.status === "rejected"
                ? errorCode(result.reason)
                : "UNKNOWN_ERROR",
          };
        }
        const snapshot = result.value.item.find(
          (item) => item.thscode === entry.code,
        );
        if (!snapshot) return { ...entry, status: "missing" };
        return {
          ...entry,
          status: "ok",
          lastPrice: snapshot.last_price,
          changePct: snapshot.price_change_ratio_pct,
          turnover: snapshot.turnover,
          timestamp: result.value.timestamp,
        };
      }

      return { ...entry, status: "unsupported" };
    });
    const sortedRows = [...rows].sort((a, b) => {
      if (a.status === "ok" && b.status !== "ok") return -1;
      if (a.status !== "ok" && b.status === "ok") return 1;
      if (a.status === "ok" && b.status === "ok") {
        const absoluteDifference = Math.abs(b.changePct!) - Math.abs(a.changePct!);
        if (absoluteDifference !== 0) return absoluteDifference;
        if (b.changePct! !== a.changePct!) return b.changePct! - a.changePct!;
      }
      return a.code.localeCompare(b.code);
    });
    const available = rows.filter((row) => row.status === "ok");
    const rising = available.filter((row) => row.changePct! > 0).length;
    const falling = available.filter((row) => row.changePct! < 0).length;
    const focusCandidates = sortedRows
      .filter((row) => row.status === "ok")
      .slice(0, 5);
    const end = Date.now();
    const start = end - 60 * DAY_MS;
    const focusHistoryResults = await Promise.allSettled(
      focusCandidates.map((row) =>
        row.assetType === "a-share"
          ? getForwardAdjustedDailyHistory(row.code, start, end)
          : getFundDailyHistory(row.code, start, end),
      ),
    );
    const focusRows: FocusRow[] = focusCandidates.map((row, index) => {
      const result = focusHistoryResults[index];
      if (!result || result.status === "rejected") {
        return {
          ...row,
          period5: null,
          period20: null,
          turnoverRatio: null,
          historyAvailable: false,
        };
      }
      const sortedBars = [...result.value.item].sort(
        (a, b) => a.date_ms - b.date_ms,
      );
      const closes = sortedBars.map((bar) => bar.close_price);
      const turnovers = sortedBars.map((bar) => bar.turnover);
      return {
        ...row,
        period5: calculatePeriodReturn(closes, 5),
        period20: calculatePeriodReturn(closes, 20),
        turnoverRatio: calculateLatestToPreviousAverage(turnovers, 20),
        historyAvailable: true,
      };
    });

    return (
      <main className="watchlist-page">
        <header className="watchlist-header">
          <div>
            <h1>MyInvest</h1>
            <p className="subtitle">我的自选 · 最新行情</p>
          </div>
          <Link className="market-link" href="/market">
            市场 / 行业研究 →
          </Link>
        </header>
        <section className="watchlist-summary" aria-label="自选股总体状态">
          <div className="fact"><span className="label">自选标的</span><span className="value">{rows.length} 个</span></div>
          <div className="fact"><span className="label">可用行情</span><span className="value">{available.length} 个</span></div>
          <div className="fact"><span className="label">上涨 / 下跌</span><span className="value"><span className="positive">{rising}</span> / <span className="negative">{falling}</span></span></div>
          <div className="fact"><span className="label">暂不可用</span><span className="value">{rows.length - available.length} 个</span></div>
        </section>
        <section className="market-section" aria-labelledby="focus-title">
          <div className="section-heading">
            <div><h2 id="focus-title">今日重点关注</h2><span className="label">按今日绝对涨跌幅选取前 {focusRows.length} 个有行情标的</span></div>
          </div>
          <div className="focus-table-wrapper">
            <table className="focus-table">
              <thead><tr><th scope="col">标的</th><th scope="col">今日</th><th scope="col">5日</th><th scope="col">20日</th><th scope="col" className="focus-turnover-header">成交额比</th></tr></thead>
              <tbody>{focusRows.map((row) => <tr key={row.code}><td className="focus-name"><FocusName row={row} /><span className="label">{row.code} · {assetLabel(row)}</span></td><td className={changeClass(row.changePct!)}>{formatChange(row.changePct!)}</td><td className={row.historyAvailable && row.period5 !== null ? changeClass(row.period5) : "neutral"}>{row.historyAvailable ? row.period5 === null ? "数据不足" : formatChange(row.period5 * 100) : "历史暂不可用"}</td><td className={row.historyAvailable && row.period20 !== null ? changeClass(row.period20) : "neutral"}>{row.historyAvailable ? row.period20 === null ? "数据不足" : formatChange(row.period20 * 100) : "历史暂不可用"}</td><td className="focus-turnover-ratio">{row.historyAvailable ? row.turnoverRatio === null ? "数据不足" : `${formatNumber(row.turnoverRatio)}×` : "历史暂不可用"}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="scope-note">按今日绝对涨跌幅选取前5个有行情标的；A股多日涨跌按前复权收盘价计算，ETF按交易所日线收盘价计算。成交额比 = 最近历史交易日成交额 ÷ 此前20个交易日平均成交额；这是历史日线比较，不代表盘中实时量比。</p>
        </section>
        <section className="market-section" aria-labelledby="watchlist-title">
          <div className="section-heading">
            <div><h2 id="watchlist-title">按绝对涨跌幅排序</h2><span className="label">优先查看当日变化最大的标的</span></div>
            <span className="label">A股与 ETF 为最新可用快照</span>
          </div>
          <div className="watchlist-table-wrapper">
            <table className="watchlist-table">
              <thead><tr><th scope="col">排名</th><th scope="col">标的</th><th scope="col">最新价</th><th scope="col">涨跌幅</th><th className="watchlist-turnover" scope="col">成交额（亿）</th><th scope="col">状态 / 时间</th></tr></thead>
              <tbody>{sortedRows.map((row, index) => <tr key={row.code}><td className="watchlist-rank">{index + 1}</td><td className="watchlist-name">{row.market === "CN" && row.assetType === "a-share" ? <Link className="stock-link" href={`/stock/${row.code}`}>{row.name}</Link> : row.market === "CN" && row.assetType === "fund-etf" ? <Link className="stock-link" href={`/etf/${row.code}`}>{row.name}</Link> : <strong>{row.name}</strong>}<span className="label">{row.code} · {assetLabel(row)}</span></td><td>{row.status === "ok" ? formatNumber(row.lastPrice!) : "—"}</td><td className={row.status === "ok" ? changeClass(row.changePct!) : "neutral"}>{row.status === "ok" ? formatChange(row.changePct!) : "—"}</td><td className="watchlist-turnover">{row.status === "ok" ? formatNumber(row.turnover! / 100_000_000) : "—"}</td><td className={`watchlist-status ${row.status}`}>{statusText(row)}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="scope-note">行情为各接口最新可用快照；是否属于当前自然日以行内行情时间为准。</p>
        </section>
        <footer>数据仅供个人研究，不构成投资建议。</footer>
      </main>
    );
  } catch (error) {
    const watchlistError = error instanceof HithinkError ? error : new HithinkError("自选股看板加载失败。", "UNKNOWN_ERROR");
    return <main className="watchlist-page"><h1>MyInvest</h1><p className="subtitle">我的自选 · 最新行情</p><section className="panel error" role="alert"><h2 className="error-title">自选股配置暂不可用</h2><p className="error-details">{watchlistError.message}{watchlistError.code ? <><br />错误代码：{watchlistError.code}</> : null}</p></section><footer>未使用模拟数据。</footer></main>;
  }
}
