import "server-only";

const HITHINK_BASE_URL = "https://fuyao.aicubes.cn";

type HithinkEnvelope<T> = {
  code: number;
  message: string;
  request_id: string;
  data: T | null;
};

export type TradingDay = {
  date_ms: number;
  date: string;
};

export type TradingCalendar = {
  timestamp: number;
  item: TradingDay[];
};

export type IndexSnapshot = {
  thscode: string;
  last_price: number;
  price_change: number;
  price_change_ratio_pct: number;
};

export type IndexSnapshots = {
  timestamp: number;
  item: IndexSnapshot[];
};

export type IndustryIndex = {
  thscode: string;
  name: string;
};

export type IndustryCatalog = {
  timestamp: number;
  item: IndustryIndex[];
};

export type IndexConstituent = {
  thscode: string;
  ticker: string;
  name: string;
};

export type IndexConstituents = {
  timestamp: number;
  item: IndexConstituent[];
};

export type StockSnapshot = {
  thscode: string;
  last_price: number;
  price_change: number;
  price_change_ratio_pct: number;
  open_price: number;
  high_price: number;
  low_price: number;
  prev_price: number;
  volume: number;
  turnover: number;
};

export type StockSnapshots = {
  timestamp: number | null;
  item: StockSnapshot[];
};

export type StockDailyBar = {
  date_ms: number;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  turnover: number;
};

export type StockDailyHistory = {
  timestamp: number;
  item: StockDailyBar[];
};

type FinancialStatementBase = {
  thscode: string;
  ticker: string;
  period: string;
  period_end_ms: number;
  report_date_ms: number;
  fiscal_year: number;
  fiscal_period: string;
  currency: string;
};

export type IncomeStatement = FinancialStatementBase & {
  operating_income: number | null;
  parent_holder_net_profit: number | null;
};

export type BalanceSheet = FinancialStatementBase & {
  assets_total: number | null;
  total_debt: number | null;
};

export type CashFlowStatement = FinancialStatementBase & {
  act_cash_flow_net: number | null;
};

export type FinancialStatements<T> = {
  timestamp: number;
  item: T[];
};

export type FinancialIndicator = {
  index_id: string;
  value: string | null;
};

export type FinancialAbility = {
  ability: string;
  indicators: FinancialIndicator[];
};

export type FinancialIndicators = {
  thscode: string;
  report: string;
  abilities: FinancialAbility[];
};

export type FundMarketSnapshotItem = {
  thscode: string;
  last_price: number;
  price_change: number;
  price_change_ratio_pct: number;
  open_price: number;
  high_price: number;
  low_price: number;
  prev_price: number;
  volume: number;
  turnover: number;
};

export type FundMarketSnapshot = {
  timestamp: number;
  item: FundMarketSnapshotItem[];
};

export type FundDailyBar = {
  date_ms: number;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  turnover: number;
};

export type FundDailyHistory = {
  timestamp: number;
  thscode: string;
  interval: string;
  item: FundDailyBar[];
};

export type AShareTicker = {
  thscode: string;
  name: string;
  asset_type: string;
};

type TickerSearch = {
  item: AShareTicker[];
};

export class HithinkError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "HithinkError";
  }
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || Number.isFinite(value);
}

function isFinancialStatementBase(value: FinancialStatementBase): boolean {
  return (
    typeof value.thscode === "string" &&
    value.thscode.trim() !== "" &&
    typeof value.ticker === "string" &&
    value.ticker.trim() !== "" &&
    typeof value.period === "string" &&
    value.period.trim() !== "" &&
    Number.isFinite(value.period_end_ms) &&
    Number.isFinite(value.report_date_ms) &&
    Number.isFinite(value.fiscal_year) &&
    typeof value.fiscal_period === "string" &&
    value.fiscal_period.trim() !== "" &&
    typeof value.currency === "string" &&
    value.currency.trim() !== ""
  );
}

export async function hithinkFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.HITHINK_FINANCE_API_KEY?.trim();

  if (!apiKey) {
    throw new HithinkError(
      "数据服务未配置：缺少 HITHINK_FINANCE_API_KEY。",
      "CONFIG_MISSING",
    );
  }

  let response: Response;

  try {
    response = await fetch(new URL(path, HITHINK_BASE_URL), {
      headers: {
        Accept: "application/json",
        "X-api-key": apiKey,
      },
      cache: "no-store",
    });
  } catch {
    throw new HithinkError("无法连接同花顺金融数据服务。", "NETWORK_ERROR");
  }

  if (!response.ok) {
    throw new HithinkError(
      "同花顺金融数据服务返回 HTTP 错误。",
      `HTTP_${response.status}`,
    );
  }

  let envelope: HithinkEnvelope<T>;

  try {
    envelope = (await response.json()) as HithinkEnvelope<T>;
  } catch {
    throw new HithinkError("同花顺金融数据服务返回了无效响应。", "INVALID_JSON");
  }

  if (typeof envelope.code !== "number") {
    throw new HithinkError("同花顺金融数据服务响应格式不正确。", "INVALID_RESPONSE");
  }

  if (envelope.code !== 0) {
    throw new HithinkError(
      envelope.message || "同花顺金融数据服务请求失败。",
      String(envelope.code),
      envelope.request_id,
    );
  }

  if (envelope.data == null) {
    throw new HithinkError("同花顺金融数据服务未返回数据。", "EMPTY_DATA");
  }

  return envelope.data;
}

export async function getTradingDays(): Promise<TradingCalendar> {
  const calendar = await hithinkFetch<TradingCalendar>(
    "/api/a-share/calendar/trading-days",
  );

  if (!Number.isFinite(calendar.timestamp) || !Array.isArray(calendar.item)) {
    throw new HithinkError("交易日历响应格式不正确。", "INVALID_CALENDAR");
  }

  return calendar;
}

export async function getIndexSnapshots(
  thscodes: readonly string[],
): Promise<IndexSnapshots> {
  const params = new URLSearchParams({
    thscodes: thscodes.join(","),
  });
  const snapshots = await hithinkFetch<IndexSnapshots>(
    `/api/a-share-index/prices/snapshot?${params}`,
  );

  if (
    !Number.isFinite(snapshots.timestamp) ||
    !Array.isArray(snapshots.item) ||
    !snapshots.item.every(
      (item) =>
        typeof item.thscode === "string" &&
        item.thscode.trim() !== "" &&
        Number.isFinite(item.last_price) &&
        Number.isFinite(item.price_change) &&
        Number.isFinite(item.price_change_ratio_pct),
    )
  ) {
    throw new HithinkError("指数快照响应格式不正确。", "INVALID_INDEX_SNAPSHOTS");
  }

  return snapshots;
}

export async function getIndustryIndices(): Promise<IndustryCatalog> {
  const catalog = await hithinkFetch<IndustryCatalog>(
    "/api/a-share-index/catalog/ths-index-list?tag=industry",
  );

  if (
    !Number.isFinite(catalog.timestamp) ||
    !Array.isArray(catalog.item) ||
    !catalog.item.every(
      (item) =>
        typeof item.thscode === "string" &&
        item.thscode.trim() !== "" &&
        typeof item.name === "string" &&
        item.name.trim() !== "",
    )
  ) {
    throw new HithinkError("行业目录响应格式不正确。", "INVALID_INDUSTRY_CATALOG");
  }

  if (catalog.item.length === 0) {
    throw new HithinkError("同花顺行业目录暂无数据。", "EMPTY_INDUSTRY_CATALOG");
  }

  return catalog;
}

export async function getIndexConstituents(
  thscode: string,
): Promise<IndexConstituents> {
  const params = new URLSearchParams({ thscode });
  const constituents = await hithinkFetch<IndexConstituents>(
    `/api/a-share-index/constituents/ths-stock-list?${params}`,
  );

  if (
    !Number.isFinite(constituents.timestamp) ||
    !Array.isArray(constituents.item) ||
    !constituents.item.every(
      (item) =>
        typeof item.thscode === "string" &&
        item.thscode.trim() !== "" &&
        typeof item.ticker === "string" &&
        item.ticker.trim() !== "" &&
        typeof item.name === "string" &&
        item.name.trim() !== "",
    )
  ) {
    throw new HithinkError(
      "指数成分股响应格式不正确。",
      "INVALID_INDEX_CONSTITUENTS",
    );
  }

  return constituents;
}

export async function getStockSnapshots(
  thscodes: readonly string[],
): Promise<StockSnapshots> {
  const params = new URLSearchParams({
    thscodes: thscodes.join(","),
  });
  const snapshots = await hithinkFetch<StockSnapshots>(
    `/api/a-share/prices/snapshot?${params}`,
  );

  if (
    (snapshots.timestamp !== null && !Number.isFinite(snapshots.timestamp)) ||
    !Array.isArray(snapshots.item) ||
    !snapshots.item.every(
      (item) =>
        typeof item.thscode === "string" &&
        item.thscode.trim() !== "" &&
        Number.isFinite(item.last_price) &&
        Number.isFinite(item.price_change_ratio_pct) &&
        Number.isFinite(item.turnover),
    )
  ) {
    throw new HithinkError("股票快照响应格式不正确。", "INVALID_STOCK_SNAPSHOTS");
  }

  return snapshots;
}

export async function getFundMarketSnapshot(
  thscode: string,
): Promise<FundMarketSnapshot> {
  const params = new URLSearchParams({ thscode });
  const snapshot = await hithinkFetch<FundMarketSnapshot>(
    `/api/fund/market/snapshot?${params}`,
  );

  if (
    !Number.isFinite(snapshot.timestamp) ||
    !Array.isArray(snapshot.item) ||
    !snapshot.item.every(
      (item) =>
        typeof item.thscode === "string" &&
        item.thscode.trim() !== "" &&
        Number.isFinite(item.last_price) &&
        Number.isFinite(item.price_change) &&
        Number.isFinite(item.price_change_ratio_pct) &&
        Number.isFinite(item.turnover),
    )
  ) {
    throw new HithinkError(
      "场内基金行情响应格式不正确。",
      "INVALID_FUND_MARKET_SNAPSHOT",
    );
  }

  return snapshot;
}

export async function getFundDailyHistory(
  thscode: string,
  start: number,
  end: number,
): Promise<FundDailyHistory> {
  const params = new URLSearchParams({
    thscode,
    interval: "1d",
    start: String(start),
    end: String(end),
  });
  const history = await hithinkFetch<FundDailyHistory>(
    `/api/fund/market/historical?${params}`,
  );

  if (
    !Number.isFinite(history.timestamp) ||
    typeof history.thscode !== "string" ||
    history.thscode.trim() === "" ||
    history.thscode !== thscode ||
    history.interval !== "1d" ||
    !Array.isArray(history.item) ||
    !history.item.every(
      (item) =>
        Number.isFinite(item.date_ms) &&
        Number.isFinite(item.open_price) &&
        Number.isFinite(item.high_price) &&
        Number.isFinite(item.low_price) &&
        Number.isFinite(item.close_price) &&
        Number.isFinite(item.volume) &&
        Number.isFinite(item.turnover),
    )
  ) {
    throw new HithinkError("ETF 历史行情响应格式不正确。", "INVALID_FUND_HISTORY");
  }

  if (history.item.length === 0) {
    throw new HithinkError("ETF 历史行情暂无数据。", "EMPTY_FUND_HISTORY");
  }

  return history;
}

export async function getForwardAdjustedDailyHistory(
  thscode: string,
  start: number,
  end: number,
): Promise<StockDailyHistory> {
  const params = new URLSearchParams({
    thscode,
    interval: "1d",
    start: String(start),
    end: String(end),
    adjust: "forward",
  });
  const history = await hithinkFetch<StockDailyHistory>(
    `/api/a-share/prices/historical?${params}`,
  );
  if (
    !Number.isFinite(history.timestamp) ||
    !Array.isArray(history.item) ||
    !history.item.every(
      (item) =>
        Number.isFinite(item.date_ms) &&
        Number.isFinite(item.open_price) &&
        Number.isFinite(item.high_price) &&
        Number.isFinite(item.low_price) &&
        Number.isFinite(item.close_price) &&
        Number.isFinite(item.volume) &&
        Number.isFinite(item.turnover),
    )
  ) {
    throw new HithinkError("股票历史行情响应格式不正确。", "INVALID_STOCK_HISTORY");
  }

  if (history.item.length === 0) {
    throw new HithinkError("股票历史行情暂无数据。", "EMPTY_STOCK_HISTORY");
  }

  return history;
}

function financialStatementParams(thscode: string): string {
  return new URLSearchParams({
    thscode,
    period: "quarterly",
    limit: "8",
  }).toString();
}

export async function getIncomeStatements(
  thscode: string,
): Promise<FinancialStatements<IncomeStatement>> {
  const statements = await hithinkFetch<FinancialStatements<IncomeStatement>>(
    `/api/a-share/financials/income-statements?${financialStatementParams(thscode)}`,
  );
  if (
    !Number.isFinite(statements.timestamp) ||
    !Array.isArray(statements.item) ||
    !statements.item.every(
      (item) =>
        isFinancialStatementBase(item) &&
        isNullableFiniteNumber(item.operating_income) &&
        isNullableFiniteNumber(item.parent_holder_net_profit),
    )
  ) {
    throw new HithinkError("利润表响应格式不正确。", "INVALID_INCOME_STATEMENTS");
  }
  return statements;
}

export async function getBalanceSheets(
  thscode: string,
): Promise<FinancialStatements<BalanceSheet>> {
  const statements = await hithinkFetch<FinancialStatements<BalanceSheet>>(
    `/api/a-share/financials/balance-sheets?${financialStatementParams(thscode)}`,
  );
  if (
    !Number.isFinite(statements.timestamp) ||
    !Array.isArray(statements.item) ||
    !statements.item.every(
      (item) =>
        isFinancialStatementBase(item) &&
        isNullableFiniteNumber(item.assets_total) &&
        isNullableFiniteNumber(item.total_debt),
    )
  ) {
    throw new HithinkError("资产负债表响应格式不正确。", "INVALID_BALANCE_SHEETS");
  }
  return statements;
}

export async function getCashFlowStatements(
  thscode: string,
): Promise<FinancialStatements<CashFlowStatement>> {
  const statements = await hithinkFetch<FinancialStatements<CashFlowStatement>>(
    `/api/a-share/financials/cash-flow-statements?${financialStatementParams(thscode)}`,
  );
  if (
    !Number.isFinite(statements.timestamp) ||
    !Array.isArray(statements.item) ||
    !statements.item.every(
      (item) =>
        isFinancialStatementBase(item) &&
        isNullableFiniteNumber(item.act_cash_flow_net),
    )
  ) {
    throw new HithinkError("现金流量表响应格式不正确。", "INVALID_CASH_FLOW_STATEMENTS");
  }
  return statements;
}

export async function getFinancialIndicators(
  thscode: string,
  report: string,
): Promise<FinancialIndicators> {
  const params = new URLSearchParams({ thscode, report });
  const indicators = await hithinkFetch<FinancialIndicators>(
    `/api/a-share/financials/indicators?${params}`,
  );
  if (
    indicators.thscode !== thscode ||
    indicators.report !== report ||
    !Array.isArray(indicators.abilities) ||
    !indicators.abilities.every(
      (ability) =>
        typeof ability.ability === "string" &&
        Array.isArray(ability.indicators) &&
        ability.indicators.every(
          (indicator) =>
            typeof indicator.index_id === "string" &&
            (typeof indicator.value === "string" || indicator.value === null),
        ),
    )
  ) {
    throw new HithinkError("财务指标响应格式不正确。", "INVALID_FINANCIAL_INDICATORS");
  }
  return indicators;
}

export async function getAshareTicker(
  thscode: string,
): Promise<AShareTicker | null> {
  const params = new URLSearchParams({
    q: thscode,
    asset_type: "a-share",
    limit: "10",
  });
  const search = await hithinkFetch<TickerSearch>(
    `/api/meta/tickers/search?${params}`,
  );

  if (
    !Array.isArray(search.item) ||
    !search.item.every(
      (item) =>
        typeof item.thscode === "string" &&
        item.thscode.trim() !== "" &&
        typeof item.name === "string" &&
        item.name.trim() !== "" &&
        typeof item.asset_type === "string" &&
        item.asset_type.trim() !== "",
    )
  ) {
    throw new HithinkError("股票身份检索响应格式不正确。", "INVALID_TICKER_SEARCH");
  }

  return (
    search.item.find(
      (item) =>
        item.thscode === thscode && item.asset_type === "a-share",
    ) ?? null
  );
}
