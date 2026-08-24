# MyInvest20260824

个人 A 股研究 Web 应用，提供市场 → 行业 → 股票的真实数据研究闭环。

## 当前功能

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

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://localhost:8030>。

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
