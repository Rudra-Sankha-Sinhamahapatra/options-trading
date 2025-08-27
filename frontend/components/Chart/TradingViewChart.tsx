"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type ISeriesApi,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { OHLCData } from "@/types/chartPage";

export default function TradingViewChart({ data }: { data: OHLCData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#262b33" },
        horzLines: { color: "#262b33" },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      timeScale: { timeVisible: true, borderColor: "#3a4453" },
      rightPriceScale: { borderColor: "#3a4453" },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      chartRef.current.resize(clientWidth, clientHeight);
    });
    ro.observe(containerRef.current);
    resizeObsRef.current = ro;

    const onWinResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      chartRef.current.resize(clientWidth, clientHeight);
    };
    window.addEventListener("resize", onWinResize);

    return () => {
      window.removeEventListener("resize", onWinResize);
      resizeObsRef.current?.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const formatted = data
        .map((candle) => ({
          time: convertTimestamp(candle.time),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }))
        .sort((a, b) => a.time - b.time)
        .filter((candle, index, array) => {
          if (index === 0) return true;
          return candle.time !== array[index - 1].time;
        });

      console.log("Formatted data for chart:", formatted.slice(0, 5)); 

      seriesRef.current.setData(formatted);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[78vh] rounded-lg"
      style={{ background: "#000" }}
    />
  );
}


const convertTimestamp = (timestamp: number | string): UTCTimestamp => {
  if (typeof timestamp === 'string') {
    return Math.floor(new Date(timestamp).getTime() / 1000) as UTCTimestamp;
  }
  return timestamp as UTCTimestamp;
};