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

  if (envelope.data === null) {
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
