"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

type StockKlineChartProps = {
  dates: string[];
  candles: [number, number, number, number][];
  volumes: number[];
  ma20: (number | null)[];
  ma60: (number | null)[];
  ma120: (number | null)[];
  ariaLabel?: string;
};

export default function StockKlineChart({
  dates,
  candles,
  volumes,
  ma20,
  ma60,
  ma120,
  ariaLabel = "前复权日 K、MA20、MA60、MA120 与成交量图表",
}: StockKlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current);
    const start = Math.max(0, ((dates.length - 120) / dates.length) * 100);

    chart.setOption({
      animation: false,
      legend: { top: 0, data: ["日K", "MA20", "MA60", "MA120"] },
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
      axisPointer: { link: [{ xAxisIndex: "all" }] },
      grid: [
        { left: 56, right: 18, top: 44, height: "56%" },
        { left: 56, right: 18, top: "74%", height: "13%" },
      ],
      xAxis: [
        {
          type: "category",
          data: dates,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisLabel: { show: false },
          min: "dataMin",
          max: "dataMax",
        },
        {
          type: "category",
          gridIndex: 1,
          data: dates,
          boundaryGap: false,
          min: "dataMin",
          max: "dataMax",
        },
      ],
      yAxis: [
        { scale: true, splitArea: { show: true } },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
        },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: [0, 1], start, end: 100 },
        {
          type: "slider",
          xAxisIndex: [0, 1],
          start,
          end: 100,
          bottom: 8,
          height: 20,
        },
      ],
      series: [
        {
          name: "日K",
          type: "candlestick",
          data: candles,
          itemStyle: {
            color: "#c23531",
            color0: "#16833a",
            borderColor: "#c23531",
            borderColor0: "#16833a",
          },
        },
        {
          name: "MA20",
          type: "line",
          data: ma20,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.4 },
        },
        {
          name: "MA60",
          type: "line",
          data: ma60,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.4 },
        },
        {
          name: "MA120",
          type: "line",
          data: ma120,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.4 },
        },
        {
          name: "成交量",
          type: "bar",
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              candles[params.dataIndex][1] >= candles[params.dataIndex][0]
                ? "#c23531"
                : "#16833a",
          },
        },
      ],
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [candles, dates, ma20, ma60, ma120, volumes]);

  return (
    <div
      ref={containerRef}
      className="stock-chart"
      role="img"
      aria-label={ariaLabel}
    />
  );
}
