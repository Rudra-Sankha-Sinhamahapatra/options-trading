'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, LoaderCircle, Play, Pause } from 'lucide-react';
import { ApiResponse, OHLCData } from '@/types/chartPage';
import { CURRENCY_OPTIONS, INTERVAL_OPTIONS } from '@/config/chartPage';
import { config } from '@/config/config';
import TradingViewChart from './TradingViewChart';

export default function CandlestickChart() {
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDC');
  const [selectedInterval, setSelectedInterval] = useState('1m');
  const [candleData, setCandleData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isPolling, setIsPolling] = useState(true);

  const BACKEND_URL = config.backend.url;

  const convertTimestamp = (timestamp: number | string): Date => {
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return new Date(timestamp * 1000);
  };

  const fetchCandleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${BACKEND_URL}/api/v1/candles?asset=${selectedAsset}&interval=${selectedInterval}&limit=100`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData: ApiResponse = await response.json();

      console.log('API Response:', responseData);

      if (responseData.success && responseData.data && Array.isArray(responseData.data)) {
        const processedData = responseData.data.map(candle => ({
          ...candle,
          volume: candle.volume || 0,
        }))
          .sort((a, b) => {
            const timeA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time * 1000;
            const timeB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time * 1000;
            return timeA - timeB;
          })
          .filter((candle, index, array) => {
            if (index === 0) return true;
            const currentTime = convertTimestamp(candle.time).getTime();
            const prevTime = convertTimestamp(array[index - 1].time).getTime();
            return currentTime !== prevTime;
          });


        setCandleData(processedData);
        setLastUpdated(new Date().toLocaleTimeString());
        console.log('Processed candle data:', processedData);
      } else {
        console.error('Invalid response structure:', responseData);
        throw new Error('Invalid response format - missing data array');
      }
    } catch (err) {
      console.error('Error fetching candle data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedAsset, selectedInterval]);

  useEffect(() => {
    fetchCandleData();

    const interval = setInterval(() => {
      if (isPolling) {
        fetchCandleData();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchCandleData, isPolling]);

  const handleAssetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAsset(event.target.value);
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedInterval(event.target.value);
  };

  const togglePolling = () => {
    setIsPolling(!isPolling);
  };

  const calculatePriceChange = () => {
    if (candleData.length < 2) return { change: 0, percentage: 0 };

    const latest = candleData[candleData.length - 1];
    const previous = candleData[candleData.length - 2];
    const change = latest.close - previous.close;
    const percentage = (change / previous.close) * 100;

    return { change, percentage };
  };

  const priceChange = calculatePriceChange();
  const currentPrice = candleData.length > 0 ? candleData[candleData.length - 1].close : 0;
  const selectedCurrency = CURRENCY_OPTIONS.find(c => c.value === selectedAsset);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 bg-black rounded-lg shadow-lg">

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Live Candlestick Chart
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <span className="text-xl sm:text-2xl font-bold text-white">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`text-base sm:text-lg font-semibold ${priceChange.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              {priceChange.change >= 0 ? '+' : ''}
              {priceChange.change.toFixed(2)} ({priceChange.percentage.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="w-full lg:w-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-row gap-2 lg:gap-4">

            <div className="col-span-1">
              <label className="block text-xs sm:text-sm font-medium  text-gray-300 mb-1">
                Currency
              </label>
              <select
                value={selectedAsset}
                onChange={handleAssetChange}
                className="w-full px-2 sm:px-3 py-2 text-sm border border-zinc-600 rounded-md 
                            bg-zinc-900 text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                Interval
              </label>
              <select
                value={selectedInterval}
                onChange={handleIntervalChange}
                className="w-full px-2 sm:px-3 py-2 text-sm border border-zinc-600 rounded-md 
                           bg-zinc-900 text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <button
                onClick={togglePolling}
                className={`w-full px-2 sm:px-3 py-2 rounded-md font-medium transition-colors text-sm flex items-center justify-center gap-1 ${isPolling
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-zinc-600 hover:bg-zinc-700 text-white'
                  }`}
              >
                {isPolling ? (
                  <>
                    <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Live</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Paused</span>
                  </>
                )}
              </button>
            </div>

            <div className="col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Update</span>
              </label>
              <button
                onClick={fetchCandleData}
                disabled={loading}
                className="w-full px-2 sm:px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                           text-white rounded-md font-medium transition-colors flex items-center justify-center gap-1 text-sm"
              >
                {loading ? (
                  <LoaderCircle className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 p-3 bg-zinc-950 rounded-md gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-gray-400">
            Asset: <strong>{selectedCurrency?.symbol}</strong>
          </span>
          <span className="text-gray-400">
            Interval: <strong>{selectedInterval}</strong>
          </span>
          <span className="text-gray-400">
            Candles: <strong>{candleData.length}</strong>
          </span>
        </div>
        <div className="text-xs sm:text-sm text-gray-400">
          Last Updated: {lastUpdated}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-md">
          <p className="text-red-200">
            <strong>Error:</strong> {error}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm">Debug Info</summary>
            <pre className="text-xs mt-2 p-2 bg-zinc-900 rounded overflow-x-auto">
              Selected Asset: {selectedAsset}
              Selected Interval: {selectedInterval}
              API URL: http://localhost:3000/api/v1/candles?asset={selectedAsset}&interval={selectedInterval}&limit=100
            </pre>
          </details>
        </div>
      )}

      <div className="relative bg-black rounded-lg p-2 sm:p-4 min-h-[300px] sm:min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
            <div className="flex items-center gap-2 text-base sm:text-lg text-gray-400">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading chart data...
            </div>
          </div>
        )}

        {candleData.length > 0 ? (
          <TradingViewChart data={candleData} />
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-center">
              No data available. Check your API connection.
            </p>
          </div>
        )}
      </div>

      {candleData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Recent Candles (Last 10)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-white">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-2 sm:px-4 py-2 text-left">Time</th>
                  <th className="px-2 sm:px-4 py-2 text-right">Open</th>
                  <th className="px-2 sm:px-4 py-2 text-right">High</th>
                  <th className="px-2 sm:px-4 py-2 text-right">Low</th>
                  <th className="px-2 sm:px-4 py-2 text-right">Close</th>
                </tr>
              </thead>
              <tbody>
                {candleData.slice(-10).reverse().map((candle, index) => (
                  <tr key={index} className="border-b border-zinc-700">
                    <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">
                      <div className="flex flex-col">
                        <span>{convertTimestamp(candle.time).toLocaleDateString()}</span>
                        <span className="text-zinc-500 text-xs">
                          {convertTimestamp(candle.time).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-right">${candle.open.toFixed(2)}</td>
                    <td className="px-2 sm:px-4 py-2 text-right text-green-600">${candle.high.toFixed(2)}</td>
                    <td className="px-2 sm:px-4 py-2 text-right text-red-600">${candle.low.toFixed(2)}</td>
                    <td className={`px-2 sm:px-4 py-2 text-right font-medium ${candle.close >= candle.open ? 'text-green-600' : 'text-red-600'
                      }`}>
                      ${candle.close.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


