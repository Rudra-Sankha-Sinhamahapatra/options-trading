"use client";

import { 
    ColorType, 
    CandlestickSeries,
    createChart, 
    IChartApi, 
    UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

interface CandleData {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface ExtendedChart extends IChartApi {
    addCandlestickSeries: (options?: any) => any;
}

export function generateRandomCandles(count: number): CandleData[] {
    const data: CandleData[] = [];
    let basePrice = 50000;
    let currentTime = Math.floor(Date.now() / 1000) - (count * 60);

    for (let i = 0; i < count; i++) {
        const open = basePrice + (Math.random() - 0.5) * 1000;
        const close = open + (Math.random() - 0.5) * 500;
        const high = Math.max(open, close) + Math.random() * 200;
        const low = Math.min(open, close) - Math.random() * 200;

        data.push({
            time: currentTime as UTCTimestamp,
            open: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            close: Number(close.toFixed(2)),
        });

        currentTime += 60;
        basePrice = close;
    }

    return data;
}

interface CandlestickChartProps {
    width?: number;
    height?: number;
}
 
export default function CandlestickChart({ width = 800, height = 400 }: CandlestickChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ExtendedChart | null>(null);
    const seriesRef = useRef<any>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#1e1e1e' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            width,
            height,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        }) as ExtendedChart;

        chartRef.current = chart;

        const series = chart.addSeries(CandlestickSeries,{
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        seriesRef.current = series;

        const randomData = generateRandomCandles(100);
        series.setData(randomData);

        chart.timeScale().fitContent();

        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
                seriesRef.current = null;
            }
        };
    }, [height, width]);


  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">BTCUSDC 1m Candlestick Chart</h2>
        <p className="text-gray-400">Random data for testing</p>
      </div>
      <div ref={chartContainerRef} className="border border-gray-600 rounded-lg" />
    </div>
  );
}