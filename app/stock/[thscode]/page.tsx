import Link from "next/link";

import {
  getBalanceSheets,
  getAshareTicker,
  getCashFlowStatements,
  getFinancialIndicators,
  getForwardAdjustedDailyHistory,
  getIncomeStatements,
  getStockSnapshots,
  HithinkError,
} from "../../../lib/hithink";
import {
  calculateAverage,
  calculateMaxDrawdown,
  calculateMovingAverage,
} from "../../../lib/stock-metrics";
import ResearchNotes from "../../components/ResearchNotes";
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

function formatChange(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}${suffix}`;
}

function formatFinancialAmount(value: number | null): string {
  if (value === null) return "—";

  const absolute = Math.abs(value);
  if (absolute >= 100_000_000) {
    return `${formatNumber(value / 100_000_000)} 亿`;
  }
  if (absolute >= 10_000) {
    return `${formatNumber(value / 10_000)} 万`;
  }
  return formatNumber(value);
}

function formatFinancialPercentage(value: string | null): string {
  if (value === null) return "—";

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${formatNumber(numericValue)}%` : "—";
}

function getIndicatorValue(
  abilities: Awaited<ReturnType<typeof getFinancialIndicators>>["abilities"],
  indexId: string,
): string | null {
  for (const ability of abilities) {
    const indicator = ability.indicators.find(
      (item) => item.index_id === indexId,
    );
    if (indicator) return indicator.value;
  }
  return null;
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

    const sortedHistory = [...history.item].sort(
      (a, b) => a.date_ms - b.date_ms,
    );
    const bars = sortedHistory.slice(-250);
    const last60 = sortedHistory.slice(-60);
    const last20 = sortedHistory.slice(-20);
    const maxDrawdown60 =
      sortedHistory.length >= 60
        ? calculateMaxDrawdown(last60.map((bar) => bar.close_price))
        : null;
    const averageTurnover20 =
      sortedHistory.length >= 20
        ? calculateAverage(last20.map((bar) => bar.turnover))
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
    const ma20 = calculateMovingAverage(closes, 20);
    const ma60 = calculateMovingAverage(closes, 60);
    const ma120 = calculateMovingAverage(closes, 120);

    let financialEvidence:
      | {
          latest: {
            fiscalYear: number;
            fiscalPeriod: string;
            reportDateMs: number;
            currency: string;
            operatingIncome: number | null;
            netProfit: number | null;
            operatingCashFlow: number | null;
            assetsTotal: number | null;
            totalDebt: number | null;
          };
          indicators: Awaited<ReturnType<typeof getFinancialIndicators>>["abilities"];
          rows: Array<{
            periodEndMs: number;
            fiscalYear: number;
            fiscalPeriod: string;
            operatingIncome: number | null;
            netProfit: number | null;
            operatingCashFlow: number | null;
            assetsTotal: number | null;
            totalDebt: number | null;
          }>;
        }
      | undefined;
    let financialError: HithinkError | undefined;

    try {
      const [incomeStatements, balanceSheets, cashFlowStatements] =
        await Promise.all([
          getIncomeStatements(ticker.thscode),
          getBalanceSheets(ticker.thscode),
          getCashFlowStatements(ticker.thscode),
        ]);
      const balanceByPeriod = new Map(
        balanceSheets.item.map((item) => [item.period_end_ms, item]),
      );
      const cashFlowByPeriod = new Map(
        cashFlowStatements.item.map((item) => [item.period_end_ms, item]),
      );
      const rows = incomeStatements.item
        .map((income) => {
          const balance = balanceByPeriod.get(income.period_end_ms);
          const cashFlow = cashFlowByPeriod.get(income.period_end_ms);
          if (!balance || !cashFlow) return null;
          return {
            periodEndMs: income.period_end_ms,
            fiscalYear: income.fiscal_year,
            fiscalPeriod: income.fiscal_period,
            reportDateMs: income.report_date_ms,
            currency: income.currency,
            operatingIncome: income.operating_income,
            netProfit: income.parent_holder_net_profit,
            operatingCashFlow: cashFlow.act_cash_flow_net,
            assetsTotal: balance.assets_total,
            totalDebt: balance.total_debt,
          };
        })
        .filter((row) => row !== null)
        .sort((a, b) => b.periodEndMs - a.periodEndMs);

      if (rows.length === 0) {
        throw new HithinkError("三张财务报表没有可对齐的报告期。", "EMPTY_FINANCIAL_ALIGNMENT");
      }

      const latest = rows[0];
      const quarter = latest.fiscalPeriod.replace(/^Q/, "");
      const indicators = await getFinancialIndicators(
        ticker.thscode,
        `${latest.fiscalYear}-${quarter}`,
      );
      financialEvidence = { latest, indicators: indicators.abilities, rows };
    } catch (error) {
      financialError =
        error instanceof HithinkError
          ? error
          : new HithinkError("财务数据请求失败。", "UNKNOWN_FINANCIAL_ERROR");
    }

    return (
      <main className="asset-detail-page">
        <Link className="back-link" href="/">
          ← 返回首页
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
          aria-labelledby="stock-metrics-title"
        >
          <div className="section-heading">
            <h2 id="stock-metrics-title">研究指标</h2>
          </div>
          <div className="stock-metrics">
            <div className="stock-fact">
              <span className="label">近60日最大回撤</span>
              <strong>
                {maxDrawdown60 === null
                  ? "数据不足"
                  : `${formatNumber(maxDrawdown60 * 100)}%`}
              </strong>
            </div>
            <div className="stock-fact">
              <span className="label">近20日平均成交额</span>
              <strong>
                {averageTurnover20 === null
                  ? "数据不足"
                  : `${formatNumber(averageTurnover20 / 100_000_000)} 亿`}
              </strong>
            </div>
          </div>
          <p className="scope-note">
            最大回撤按最近60个交易日前复权收盘价计算；平均成交额按最近20个交易日计算。
          </p>
        </section>
        <section
          className="stock-history-section financial-health-section"
          aria-labelledby="financial-health-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="financial-health-title">财务体检</h2>
              {financialEvidence ? (
                <span className="label">
                  {financialEvidence.latest.fiscalYear} {financialEvidence.latest.fiscalPeriod} · 披露 {formatShanghaiDate(financialEvidence.latest.reportDateMs)} · {financialEvidence.latest.currency}
                </span>
              ) : null}
            </div>
          </div>
          {financialEvidence ? (
            <>
              <div className="financial-evidence-grid" aria-label="最新财务证据">
                <section className="financial-evidence-card">
                  <h3>增长</h3>
                  <dl>
                    <div><dt>营业收入</dt><dd>{formatFinancialAmount(financialEvidence.latest.operatingIncome)}</dd></div>
                    <div><dt>营收同比增长率</dt><dd>{formatFinancialPercentage(getIndicatorValue(financialEvidence.indicators, "calculate_operating_income_yoy_growth_ratio"))}</dd></div>
                    <div><dt>归母净利润</dt><dd>{formatFinancialAmount(financialEvidence.latest.netProfit)}</dd></div>
                    <div><dt>归母净利润同比增长率</dt><dd>{formatFinancialPercentage(getIndicatorValue(financialEvidence.indicators, "calculate_parent_holder_net_profit_yoy_growth_ratio"))}</dd></div>
                  </dl>
                </section>
                <section className="financial-evidence-card">
                  <h3>盈利</h3>
                  <dl>
                    <div><dt>销售毛利率</dt><dd>{formatFinancialPercentage(getIndicatorValue(financialEvidence.indicators, "sale_gross_margin"))}</dd></div>
                    <div><dt>加权平均净资产收益率</dt><dd>{formatFinancialPercentage(getIndicatorValue(financialEvidence.indicators, "index_weighted_avg_roe"))}</dd></div>
                  </dl>
                </section>
                <section className="financial-evidence-card">
                  <h3>现金流</h3>
                  <dl>
                    <div><dt>经营现金流净额</dt><dd>{formatFinancialAmount(financialEvidence.latest.operatingCashFlow)}</dd></div>
                    <div><dt>净利润现金含量</dt><dd>{formatFinancialPercentage(getIndicatorValue(financialEvidence.indicators, "net_profit_cash_content"))}</dd></div>
                  </dl>
                </section>
                <section className="financial-evidence-card">
                  <h3>杠杆</h3>
                  <dl>
                    <div><dt>总资产</dt><dd>{formatFinancialAmount(financialEvidence.latest.assetsTotal)}</dd></div>
                    <div><dt>总负债</dt><dd>{formatFinancialAmount(financialEvidence.latest.totalDebt)}</dd></div>
                    <div><dt>资产负债率</dt><dd>{formatFinancialPercentage(getIndicatorValue(financialEvidence.indicators, "assets_debt_ratio"))}</dd></div>
                  </dl>
                </section>
              </div>
              <div className="financial-table-wrapper">
                <table className="financial-table">
                  <thead><tr><th>报告期</th><th>营收</th><th>归母净利润</th><th>经营现金流</th><th>总资产</th><th>总负债</th></tr></thead>
                  <tbody>
                    {financialEvidence.rows.map((row) => (
                      <tr key={row.periodEndMs}>
                        <th scope="row">{row.fiscalYear} {row.fiscalPeriod}</th>
                        <td>{formatFinancialAmount(row.operatingIncome)}</td>
                        <td>{formatFinancialAmount(row.netProfit)}</td>
                        <td>{formatFinancialAmount(row.operatingCashFlow)}</td>
                        <td>{formatFinancialAmount(row.assetsTotal)}</td>
                        <td>{formatFinancialAmount(row.totalDebt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="scope-note">
                数据源：同花顺金融数据 API。三张报表按报告期末对齐；按接口季度报告期原始口径展示，不将不同累计报告期直接解释为单季度环比；同比增长率仅使用财务指标接口已提供值。
              </p>
            </>
          ) : (
            <p className="scope-note financial-unavailable">
              财务数据暂不可用{financialError?.code ? ` · ${financialError.code}` : ""}
            </p>
          )}
        </section>
        <ResearchNotes assetCode={ticker.thscode} assetType="a-share" />
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
      <main className="asset-detail-page">
        <Link className="back-link" href="/">
          ← 返回首页
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
