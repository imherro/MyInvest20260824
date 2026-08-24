# MyInvest20260824

个人研究 Web 应用：首页提供自选股每日行情，市场 → 行业 → 股票研究闭环保留在 `/market`。

## 当前功能

- 自选股 A 股与 ETF 最新行情，按绝对涨跌幅排序
- 不支持资产的明确状态提示
- A 股自选股直接进入既有详情研究页
- 主要指数最新快照
- 同花顺行业最新涨跌
- 行业当前成分股与上涨宽度
- A 股最新行情快照
- 前复权日 K 与成交量
- MA20 / MA60 / MA120
- 近 60 日最大回撤
- 近 20 日平均成交额

## 数据源

使用 Hithink Finance API 真实数据，不使用 mock 或 fallback。私人本地数据不进入公开仓库。

## 环境

复制 `.env.example` 为 `.env`，并在本地配置：

```text
HITHINK_FINANCE_API_KEY
```

不要提交 `.env` 或 API Key。

## 自选股配置

在本地创建 `.local/watchlist.csv`，格式为：

```csv
name,code,market,asset_type
山东高速,600350.SH,CN,a-share
中证500ETF南方,510500.SH,CN,fund-etf
```

`.local/` 已被 Git 忽略。该文件是运行时本地配置；当前标的会在网页公开展示。

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://localhost:8030>。

市场与行业研究页：<http://localhost:8030/market>。

## 验证

```bash
npm test
npm run build
```

## 部署

Next.js 服务固定监听 `0.0.0.0:8030`。当前外部 Cloudflare Tunnel：

<https://invest0830.okbbc.com>

## 当前范围

本项目是个人 A 股研究工具，数据仅供个人研究，不构成投资建议。
