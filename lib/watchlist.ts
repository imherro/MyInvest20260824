import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { HithinkError } from "./hithink";

export type WatchlistEntry = {
  name: string;
  code: string;
  market: string;
  assetType: string;
};

const WATCHLIST_HEADER = "name,code,market,asset_type";

export async function readWatchlist(): Promise<WatchlistEntry[]> {
  const watchlistPath = path.join(process.cwd(), ".local", "watchlist.csv");
  let source: string;

  try {
    source = await readFile(watchlistPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new HithinkError("未找到本地自选股配置文件。", "WATCHLIST_FILE_MISSING");
    }

    throw new HithinkError("无法读取本地自选股配置文件。", "WATCHLIST_READ_ERROR");
  }

  const lines = source.split(/\r?\n/);

  if (lines[0] !== WATCHLIST_HEADER) {
    throw new HithinkError("自选股配置文件表头不正确。", "INVALID_WATCHLIST_CSV");
  }

  const entries = lines.slice(1).flatMap((line) => {
    if (line.trim() === "") return [];

    const columns = line.split(",");
    if (columns.length !== 4) {
      throw new HithinkError("自选股配置文件行格式不正确。", "INVALID_WATCHLIST_CSV");
    }

    const [rawName, rawCode, rawMarket, rawAssetType] = columns;
    const entry = {
      name: rawName.trim(),
      code: rawCode.trim().toUpperCase(),
      market: rawMarket.trim().toUpperCase(),
      assetType: rawAssetType.trim().toLowerCase(),
    };

    if (Object.values(entry).some((value) => value === "")) {
      throw new HithinkError("自选股配置文件存在空字段。", "INVALID_WATCHLIST_CSV");
    }

    return [entry];
  });

  if (entries.length === 0) {
    throw new HithinkError("自选股配置文件没有标的。", "EMPTY_WATCHLIST");
  }

  const codes = new Set<string>();
  for (const entry of entries) {
    if (codes.has(entry.code)) {
      throw new HithinkError("自选股配置文件存在重复代码。", "DUPLICATE_WATCHLIST_CODE");
    }
    codes.add(entry.code);
  }

  return entries;
}
