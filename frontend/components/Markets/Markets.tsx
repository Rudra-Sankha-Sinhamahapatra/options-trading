'use client';

import { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebsocket';
import { config } from '@/config/config';
import Cookies from 'js-cookie';
import Orders from './Orders';

interface OrderForm {
  asset: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
}

interface UserBalance {
  usdc: { qty: number; locked: number };
  btc: { qty: number; locked: number };
  eth: { qty: number; locked: number };
  sol: { qty: number; locked: number };
}

const SUPPORTED_ASSETS = ['BTCUSDC', 'ETHUSDC', 'SOLUSDC'];

export default function MarketsPage() {
  const { user, isAuthenticated } = useAuth();
  const { prices, isConnected, error: wsError, subscribe } = useWebSocket();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    asset: '',
    type: 'buy',
    quantity: 0,
    price: 0,
  });
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const BACKEND_URL = config.backend.url;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && mounted) {
      fetchBalance();
    }
  }, [isAuthenticated, mounted]);

  useEffect(() => {    
    if (isConnected && mounted) {
      setTimeout(() => {
        subscribe(SUPPORTED_ASSETS);
      }, 100);
    }
  }, [isConnected, mounted, subscribe]);

  const fetchBalance = async () => {
    if (!isAuthenticated) return;
    
    setBalanceLoading(true);
    try {
      const token = Cookies.get('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/v1/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setBalance(result.balance);
      } else {
        console.error('Failed to fetch balance:', result.error);
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const marketData = SUPPORTED_ASSETS.map(asset => {
    const priceData = prices[asset];
    return {
      asset,
      price: priceData?.price || null,
      change24h: priceData?.change24h || null,
      bid: priceData?.bid || null,
      ask: priceData?.ask || null,
      spread: priceData?.bid && priceData?.ask ? priceData.ask - priceData.bid : null,
      lastUpdate: priceData?.timestamp || null,
      hasData: !!priceData
    };
  });

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setOrderError('Please sign in to place orders');
      return;
    }

    if (!orderForm.quantity || !orderForm.price) {
      setOrderError('Please enter valid quantity and price');
      return;
    }

    setOrderLoading(true);
    setOrderError(null);
    
    try {
      const token = Cookies.get('token');
      
      if (!token) {
        setOrderError('Authentication required');
        return;
      }

      const currentPrice = prices[orderForm.asset]?.price;
      if (!currentPrice) {
        setOrderError('Current price not available. Please try again.');
        return;
      }

      const assetCode = orderForm.asset.replace('USDC', '').toLowerCase();
      const totalAmount = orderForm.quantity * orderForm.price;

      const response = await fetch(`${BACKEND_URL}/api/v1/order/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: orderForm.type,
          asset: assetCode, 
          qty: orderForm.quantity,
          usdcAmount: totalAmount,
          stopLoss: null,
          takeProfit: null
        }),
      });

      const result = await response.json();

      if (result.success) {
        const executedAt = result.priceDetails?.priceType || 'market';
        alert(`✅ Trade executed successfully! 
${result.trade?.type?.toUpperCase()} ${result.trade?.qty} ${orderForm.asset.replace('USDC', '')} 
at $${result.executionPrice?.toFixed(2)} (${executedAt} price)
Spread: $${result.priceDetails?.spread?.toFixed(2) || 'N/A'}`);
        
        setOrderForm({ asset: '', type: 'buy', quantity: 0, price: 0 });
        setSelectedAsset(null);
        
        if (result.balance) {
          setBalance(result.balance);
        }
      } else {
        setOrderError(result.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      setOrderError('Network error. Please try again.');
    } finally {
      setOrderLoading(false);
    }
  };

  const openOrderForm = (asset: string, price: number | null) => {
    if (!price) {
      setOrderError('Price data not available');
      return;
    }
    
    setSelectedAsset(asset);
    setOrderForm({
      asset,
      type: 'buy',
      quantity: 0,
      price,
    });
    setOrderError(null);
  };

  const getExecutionPrice = (asset: string, type: 'buy' | 'sell') => {
    const priceData = prices[asset];
    if (!priceData) return 0;
    
    return type === 'buy' ? priceData.ask || 0 : priceData.bid || 0;
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-black p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading markets...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Markets</h1>
            <p className="text-gray-400">Trade cryptocurrencies with real-time pricing</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-2 text-green-500">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Live Feed</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-orange-500">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Connecting...</span>
              </div>
            )}
          </div>
        </div>

        {wsError && (
          <div className="mb-4 p-3 bg-orange-900/20 border border-orange-500 rounded-md">
            <p className="text-orange-400 text-sm">
              Price feed: {wsError}
            </p>
          </div>
        )}

        {isAuthenticated && user && (
          <div className="bg-zinc-950 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold text-white">Account Balance</h2>
              </div>
              {balanceLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            
            {balance ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400">USDC</div>
                  <div className="text-lg font-semibold text-green-500">
                    {balance.usdc.qty.toLocaleString()}
                  </div>
                  {balance.usdc.locked > 0 && (
                    <div className="text-xs text-yellow-500">
                      Locked: {balance.usdc.locked.toLocaleString()}
                    </div>
                  )}
                </div>
                
                <div className="bg-zinc-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400">BTC</div>
                  <div className="text-lg font-semibold text-orange-500">
                    {balance.btc.qty.toFixed(8)}
                  </div>
                  {balance.btc.locked > 0 && (
                    <div className="text-xs text-yellow-500">
                      Locked: {balance.btc.locked.toFixed(8)}
                    </div>
                  )}
                </div>
                
                <div className="bg-zinc-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400">ETH</div>
                  <div className="text-lg font-semibold text-blue-500">
                    {balance.eth.qty.toFixed(6)}
                  </div>
                  {balance.eth.locked > 0 && (
                    <div className="text-xs text-yellow-500">
                      Locked: {balance.eth.locked.toFixed(6)}
                    </div>
                  )}
                </div>
                
                <div className="bg-zinc-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400">SOL</div>
                  <div className="text-lg font-semibold text-purple-500">
                    {balance.sol.qty.toFixed(4)}
                  </div>
                  {balance.sol.locked > 0 && (
                    <div className="text-xs text-yellow-500">
                      Locked: {balance.sol.locked.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400">Loading balance...</div>
            )}
            
            <p className="text-sm text-gray-400 mt-4">Welcome back, {user.name}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2">
            <div className="bg-zinc-950 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-700">
                <h2 className="text-xl font-semibold text-white">Market Overview</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Asset
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Bid/Ask
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Spread
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700">
                    {marketData.map((market) => (
                      <tr key={market.asset} className="hover:bg-zinc-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {market.asset.replace('USDC', '')}
                              </div>
                              <div className="text-sm text-gray-400">{market.asset}</div>
                            </div>
                            {market.hasData && isConnected && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {market.price ? (
                            <div className="text-sm font-medium text-white">
                              ${market.price.toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              <span className="text-sm text-gray-400">Loading...</span>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {market.bid && market.ask ? (
                            <div className="text-xs text-gray-300">
                              <div className="text-green-400">${market.bid.toFixed(2)}</div>
                              <div className="text-red-400">${market.ask.toFixed(2)}</div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              <Loader2 className="h-2 w-2 animate-spin text-gray-500" />
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {market.spread ? (
                            <div className="text-sm text-gray-300">
                              ${market.spread.toFixed(2)}
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              <Loader2 className="h-2 w-2 animate-spin text-gray-500" />
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => openOrderForm(market.asset, market.price)}
                            disabled={!isAuthenticated || !market.price}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              isAuthenticated && market.price
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {market.price ? 'Trade' : 'Loading...'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-zinc-950 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Place Order</h3>
              
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Sign in to start trading</p>
                  <a 
                    href="/signin"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Sign In
                  </a>
                </div>
              ) : (
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  {orderError && (
                    <div className="p-3 bg-red-900/20 border border-red-500 rounded-md">
                      <p className="text-red-400 text-sm">{orderError}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Asset
                    </label>
                    <select
                      value={orderForm.asset}
                      onChange={(e) => {
                        const selectedAsset = e.target.value;
                        const executionPrice = getExecutionPrice(selectedAsset, orderForm.type);
                        setOrderForm({ 
                          ...orderForm, 
                          asset: selectedAsset,
                          price: executionPrice 
                        });
                        setSelectedAsset(selectedAsset);
                        setOrderError(null);
                      }}
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white"
                    >
                      <option value="">Choose an asset...</option>
                      {SUPPORTED_ASSETS.map(asset => {
                        const priceData = prices[asset];
                        const displayName = asset.replace('USDC', '');
                        return (
                          <option key={asset} value={asset}>
                            {displayName}{!priceData ? ' Loading...' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {orderForm.asset && isConnected && prices[orderForm.asset] && (
                      <div className="flex items-center mt-2 text-xs text-green-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                        Live price: ${prices[orderForm.asset].price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  
                  {orderForm.asset && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Order Type
                        </label>
                        <select
                          value={orderForm.type}
                          onChange={(e) => {
                            const newType = e.target.value as 'buy' | 'sell';
                            const priceData = prices[orderForm.asset];
                            let newPrice = orderForm.price;
                            
                            if (priceData) {
                              newPrice = newType === 'buy' ? priceData.ask || 0 : priceData.bid || 0;
                            }
                            
                            setOrderForm({ 
                              ...orderForm, 
                              type: newType,
                              price: newPrice
                            });
                          }}
                          className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white"
                        >
                          <option value="buy">
                            Buy {orderForm.asset.replace('USDC', '')} 
                            {typeof prices[orderForm.asset]?.ask === 'number' && ` at $${prices[orderForm.asset]!.ask!.toFixed(2)}`}
                          </option>
                          <option value="sell">
                            Sell {orderForm.asset.replace('USDC', '')}
                            {prices[orderForm.asset]?.bid && ` at $${prices[orderForm.asset]!.bid!.toFixed(2)}`}
                          </option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="0.00001"
                          value={orderForm.quantity}
                          onChange={(e) => setOrderForm({ ...orderForm, quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white"
                          placeholder={`Enter ${orderForm.asset.replace('USDC', '')} amount`}
                        />
                        <div className="text-xs text-gray-400 mt-1">
                          {orderForm.asset === 'BTCUSDC' && 'Min: 0.00001 BTC'}
                          {orderForm.asset === 'ETHUSDC' && 'Min: 0.001 ETH'}
                          {orderForm.asset === 'SOLUSDC' && 'Min: 0.01 SOL'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Price (USD)
                        </label>
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={orderForm.price}
                              onChange={(e) => setOrderForm({ ...orderForm, price: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white"
                              placeholder="0.00"
                            />
                            {prices[orderForm.asset] && (
                              <button
                                type="button"
                                onClick={() => setOrderForm({ ...orderForm, price: prices[orderForm.asset].price })}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-zinc-600 hover:bg-zinc-500 px-2 py-1 rounded text-white"
                              >
                                Use Market
                              </button>
                            )}
                          </div>
                          
                          {prices[orderForm.asset] && (
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Market: ${prices[orderForm.asset].price.toFixed(2)}</span>
                              {prices[orderForm.asset].bid && prices[orderForm.asset].ask && (
                                <span>Spread: ${(prices[orderForm.asset].ask! - prices[orderForm.asset].bid!).toFixed(2)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {balance && (
                        <div className="bg-zinc-700 rounded-md p-3">
                          <div className="text-xs text-gray-400 mb-1">Available Balance:</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {orderForm.type === 'buy' ? (
                              <div className="text-green-500">
                                <span className="font-medium">USDC:</span> {balance.usdc.qty.toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-blue-500">
                                <span className="font-medium">{orderForm.asset.replace('USDC', '')}:</span> {
                                  orderForm.asset === 'BTCUSDC' ? balance.btc.qty.toFixed(8) :
                                  orderForm.asset === 'ETHUSDC' ? balance.eth.qty.toFixed(6) :
                                  balance.sol.qty.toFixed(4)
                                }
                              </div>
                            )}
                            
                            <div className="text-gray-400 text-xs">
                              {orderForm.type === 'buy' && orderForm.price > 0 && (
                                <>Max: {(balance.usdc.qty / orderForm.price).toFixed(6)} {orderForm.asset.replace('USDC', '')}</>
                              )}
                              {orderForm.type === 'sell' && (
                                <>
                                  Max: {
                                    orderForm.asset === 'BTCUSDC' ? balance.btc.qty.toFixed(8) :
                                    orderForm.asset === 'ETHUSDC' ? balance.eth.qty.toFixed(6) :
                                    balance.sol.qty.toFixed(4)
                                  }
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Execution Price (USD)
                        </label>
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={orderForm.price}
                              onChange={(e) => setOrderForm({ ...orderForm, price: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white"
                              placeholder="0.00"
                            />
                            {prices[orderForm.asset] && (
                              <button
                                type="button"
                                onClick={() => {
                                  const executionPrice = orderForm.type === 'buy' 
                                    ? prices[orderForm.asset].ask 
                                    : prices[orderForm.asset].bid;
                                  setOrderForm({ ...orderForm, price: executionPrice || 0 });
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-zinc-600 hover:bg-zinc-500 px-2 py-1 rounded text-white"
                              >
                                Use {orderForm.type === 'buy' ? 'Ask' : 'Bid'}
                              </button>
                            )}
                          </div>
                          
                          {prices[orderForm.asset] && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">
                                {orderForm.type === 'buy' ? 'Ask' : 'Bid'}: $
                                {orderForm.type === 'buy' 
                                  ? prices[orderForm.asset].ask?.toFixed(2) || 'N/A'
                                  : prices[orderForm.asset].bid?.toFixed(2) || 'N/A'
                                }
                              </span>
                              <span className="text-gray-400">
                                Mid: ${((prices[orderForm.asset].bid! + prices[orderForm.asset].ask!) / 2).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {orderForm.quantity > 0 && orderForm.price > 0 && (
                        <div className="bg-zinc-800 rounded-md p-3 border border-zinc-600">
                          <div className="text-sm font-medium text-white mb-2">Order Summary</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-gray-300">
                              <span>{orderForm.type === 'buy' ? 'Buying' : 'Selling'}:</span>
                              <span>{orderForm.quantity} {orderForm.asset.replace('USDC', '')}</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                              <span>At {orderForm.type === 'buy' ? 'ask' : 'bid'} price:</span>
                              <span>${orderForm.price.toFixed(2)}</span>
                            </div>
                            {prices[orderForm.asset] && (
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>Market {orderForm.type === 'buy' ? 'ask' : 'bid'}:</span>
                                <span>
                                  ${orderForm.type === 'buy' 
                                    ? prices[orderForm.asset].ask?.toFixed(2) || 'N/A'
                                    : prices[orderForm.asset].bid?.toFixed(2) || 'N/A'
                                  }
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-white font-medium border-t border-zinc-600 pt-1">
                              <span>Total:</span>
                              <span>${(orderForm.quantity * orderForm.price).toFixed(2)} USDC</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={orderLoading || !orderForm.quantity || !orderForm.price}
                          className={`w-full py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            orderForm.type === 'buy'
                              ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50'
                              : 'bg-red-600 hover:bg-red-700 disabled:bg-red-600/50'
                          } text-white`}
                        >
                          {orderLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Placing Order...</span>
                            </div>
                          ) : (
                            `${orderForm.type === 'buy' ? 'Buy' : 'Sell'} ${orderForm.asset.replace('USDC', '')}`
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        {isAuthenticated && (
          <div className="mt-8">
            <Orders limit={5} />
          </div>
        )}
      </div>
    </main>
  );
}