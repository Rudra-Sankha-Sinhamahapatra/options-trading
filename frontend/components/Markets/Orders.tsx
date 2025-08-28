'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { config } from '@/config/config';
import Cookies from 'js-cookie';

interface Order {
  id: string;
  type: 'buy' | 'sell';
  asset: string;
  qty: number;
  stopLoss?: number;
  takeProfit?: number;
  userAmount: number;
  marketPrice?: number;
  closePrice?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  executedAt?: string;
}

interface OrdersProps {
  className?: string;
  showHeader?: boolean;
  limit?: number;
}

export default function Orders({ className = '', showHeader = true, limit }: OrdersProps) {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const BACKEND_URL = config.backend.url;

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = Cookies.get('token');
      if (!token) return;

      const url = limit 
        ? `${BACKEND_URL}/api/v1/order?limit=${limit}` 
        : `${BACKEND_URL}/api/v1/order`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setOrders(result.orders);
      } else {
        setError(result.error || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Network error while fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const formatAssetName = (asset: string) => {
    return asset.toUpperCase();
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CLOSED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'OPEN':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'CANCELLED':
        return <Clock className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOSED':
        return 'bg-green-900/50 text-green-400 border-green-500/50';
      case 'OPEN':
        return 'bg-yellow-900/50 text-yellow-400 border-yellow-500/50';
      case 'CANCELLED':
        return 'bg-red-900/50 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-900/50 text-gray-400 border-gray-500/50';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`bg-zinc-950 rounded-lg p-6 ${className}`}>
        {showHeader && <h3 className="text-lg font-semibold text-white mb-4">Trade History</h3>}
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Sign in to view your trading history</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-950 rounded-lg ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">
            {limit ? `Recent Trades (${limit})` : 'Trade History'}
          </h3>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm text-gray-400">Refresh</span>
          </button>
        </div>
      )}

      <div className="p-6">
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-400">Loading orders...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="p-3 bg-red-900/20 border border-red-500 rounded-md mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">No Trades Yet</h4>
            <p className="text-gray-400">Your trading history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const executionTime = formatDateTime(order.executedAt || order.closedAt || order.createdAt);
              const isProfit = order.closePrice && order.marketPrice 
                ? (order.type === 'buy' ? order.closePrice > order.marketPrice : order.marketPrice > order.closePrice)
                : null;
              
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
        
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      order.type === 'buy' 
                        ? 'bg-green-900/50 text-green-400' 
                        : 'bg-red-900/50 text-red-400'
                    }`}>
                      {order.type === 'buy' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">
                          {order.type.toUpperCase()} {formatAssetName(order.asset)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-400 mt-1">
                        {order.qty.toFixed(order.asset === 'btc' ? 8 : order.asset === 'eth' ? 6 : 4)} {formatAssetName(order.asset)} 
                        {order.marketPrice && (
                          <span> at ${order.marketPrice.toFixed(2)}</span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {executionTime.date} at {executionTime.time}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${order.userAmount.toFixed(2)}
                    </div>
                    
                    {order.status === 'CLOSED' && order.closePrice && order.marketPrice && (
                      <div className={`text-sm ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                        {isProfit ? '+' : ''}$
                        {(order.type === 'buy' 
                          ? (order.closePrice - order.marketPrice) * order.qty
                          : (order.marketPrice - order.closePrice) * order.qty
                        ).toFixed(2)}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      ID: {order.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              );
            })}
            
            {limit && orders.length >= limit && (
              <div className="text-center pt-4">
                <a
                  href="/orders"
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  View All Orders →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}