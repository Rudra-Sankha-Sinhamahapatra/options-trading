'use client';

import { useState, useEffect, useCallback } from 'react';
import { config } from '@/config/config';

interface PriceUpdate {
  asset: string;
  price: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  bidQty?: number;
  askQty?: number;
}

interface UseWebSocketReturn {
  prices: Record<string, PriceUpdate>;
  isConnected: boolean;
  error: string | null;
  subscribe: (assets: string[]) => void;
  unsubscribe: (assets: string[]) => void;
}

let wsInstance: WebSocket | null = null;
let wsCallbacks: Set<(prices: Record<string, PriceUpdate>) => void> = new Set();
let connectionCallbacks: Set<(connected: boolean) => void> = new Set();
let errorCallbacks: Set<(error: string | null) => void> = new Set();
let currentPrices: Record<string, PriceUpdate> = {};
let isConnectedGlobal = false;
let currentError: string | null = null;

const parseBBOData = (message: string): PriceUpdate | null => {
  try {
    const cleanMessage = message.trim().replace(/^["']|["']$/g, '');
    const parts = cleanMessage.split(' ');
    
    
    if (parts[0] === 'bbo' && parts.length >= 7) {
      const asset = parts[1];
      const timestamp = parseInt(parts[2]); 
      const bid = parseFloat(parts[3]); 
      const bidQty = parseFloat(parts[4]); 
      const ask = parseFloat(parts[5]); 
      const askQty = parseFloat(parts[6]); 
      
      if (isNaN(timestamp) || isNaN(bid) || isNaN(ask) || isNaN(bidQty) || isNaN(askQty)) {
        console.error('Invalid numeric values in BBO data:', { timestamp, bid, ask, bidQty, askQty });
        return null;
      }
      
      const price = (bid + ask) / 2;
      
      const priceUpdate: PriceUpdate = {
        asset,
        price,
        timestamp,
        bid,
        ask,
        bidQty,
        askQty,
      };
      
      console.log('  Successfully parsed price update:', priceUpdate);
      return priceUpdate;
    } else {
      console.log('Invalid BBO format - expected "bbo SYMBOL TIMESTAMP BID BIDQTY ASK ASKQTY", got:', parts);
      return null;
    }
    
  } catch (error) {
    console.error('Error parsing BBO data:', error, 'Message was:', message);
    return null;
  }
};

const notifyPriceUpdate = () => {
  wsCallbacks.forEach(callback => {
    try {
      callback({ ...currentPrices }); 
    } catch (error) {
      console.error('Error in price update callback:', error);
    }
  });
};

const notifyConnection = (connected: boolean) => {
  console.log('📢 Notifying connection status:', connected, 'to', connectionCallbacks.size, 'subscribers');
  connectionCallbacks.forEach(callback => {
    try {
      callback(connected);
    } catch (error) {
      console.error('Error in connection callback:', error);
    }
  });
};

const notifyError = (error: string | null) => {
  console.log('📢 Notifying error:', error, 'to', errorCallbacks.size, 'subscribers');
  errorCallbacks.forEach(callback => {
    try {
      callback(error);
    } catch (error) {
      console.error('Error in error callback:', error);
    }
  });
};

const connectWebSocket = () => {
  if (wsInstance?.readyState === WebSocket.OPEN) {
    console.log('🔌 WebSocket already connected');
    return;
  }

  if (wsInstance?.readyState === WebSocket.CONNECTING) {
    console.log('🔌 WebSocket already connecting');
    return;
  }

  try {
    const wsUrl = config.ws.url;
    console.log('🔌 Creating new WebSocket connection to:', wsUrl);
    
    wsInstance = new WebSocket(wsUrl);

    wsInstance.onopen = () => {
      console.log('  WebSocket connected successfully');
      isConnectedGlobal = true;
      currentError = null;
      notifyConnection(true);
      notifyError(null);
    };

    wsInstance.onmessage = (event) => {
      const rawMessage = typeof event.data === 'string' ? event.data : '';
      console.log('📨 Received raw WebSocket message:', rawMessage);
    
      try {
        let handled = false;
    
        if (rawMessage && (rawMessage.trim().startsWith('{') || rawMessage.trim().startsWith('['))) {
          try {
            const data = JSON.parse(rawMessage);
            console.log('Parsed JSON:', data);
    
            if (data?.type === 'connected') return;
    
            if (Array.isArray(data.price_updates)) {
              for (const upd of data.price_updates) {
                if (
                  typeof upd.symbol === 'string' &&
                  typeof upd.decimals === 'number' &&
                  (typeof upd.buyPrice === 'number' || typeof upd.sellPrice === 'number')
                ) {
                  const scale = Math.pow(10, upd.decimals);
                  const bid = typeof upd.sellPrice === 'number' ? upd.sellPrice / scale : undefined;
                  const ask = typeof upd.buyPrice === 'number' ? upd.buyPrice / scale : undefined;
                  const currentPrice = typeof upd.price === 'number' ? upd.price/scale : undefined;
    
                  const u: PriceUpdate = {
                    asset: upd.symbol,
                    price: currentPrice || upd.price,
                    timestamp: Date.now(),
                    bid,
                    ask,
                  };
    
                  currentPrices = { ...currentPrices, [u.asset]: u };
                }
              }
              notifyPriceUpdate();
              handled = true;
            }
    
            if (
              !handled &&
              typeof data.symbol === 'string' &&
              typeof data.price === 'number' &&
              typeof data.decimals === 'number'
            ) {
              const scale = Math.pow(10, data.decimals);
              const bid = typeof data.sellPrice === 'number' ? data.sellPrice / scale : undefined;
              const ask = typeof data.buyPrice === 'number' ? data.buyPrice / scale : undefined;
              const mid = ( (ask ?? 0) + (bid ?? 0) ) / 2;
    
              const u: PriceUpdate = {
                asset: data.symbol,
                price: (data.price ?? mid ?? 0) / scale, 
                timestamp: data.timestamp ?? Date.now(),
                bid,
                ask,
              };
    
              currentPrices = { ...currentPrices, [u.asset]: u };
              notifyPriceUpdate();
              handled = true;
            }
          } catch (jsonErr) {
            console.log('JSON parsing failed, will try legacy BBO:', jsonErr);
          }
        }
    
        if (!handled && rawMessage) {
          const parsed = parseBBOData(rawMessage);
          if (parsed) {
            currentPrices = { ...currentPrices, [parsed.asset]: parsed };
            notifyPriceUpdate();
            handled = true;
          }
        }
    
        if (!handled) {
          console.log('Unrecognized WS message. First 120 chars:', rawMessage.slice(0, 120));
        }
      } catch (err) {
        console.error('Unexpected error processing WebSocket message:', err);
      }
    };
    
    wsInstance.onclose = (event) => {
      console.log('WebSocket disconnected - Code:', event.code, 'Reason:', event.reason);
      isConnectedGlobal = false;
      notifyConnection(false);

      setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connectWebSocket();
      }, 2000);
    };

    wsInstance.onerror = (error) => {
      console.error('WebSocket connection error:', error);
      currentError = 'WebSocket connection error';
      notifyError(currentError);
    };

  } catch (err) {
    console.error('Failed to create WebSocket connection:', err);
    currentError = 'Failed to establish WebSocket connection';
    notifyError(currentError);
  }
};

export function useWebSocket(): UseWebSocketReturn {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 WebSocket hook initializing...');
    
    const priceCallback = (newPrices: Record<string, PriceUpdate>) => {
      console.log('🔔 Price callback triggered with:', newPrices);
      setPrices(newPrices);
    };
    
    const connectionCallback = (connected: boolean) => {
      console.log('🔔 Connection callback triggered:', connected);
      setIsConnected(connected);
    };
    
    const errorCallback = (error: string | null) => {
      console.log('🔔 Error callback triggered:', error);
      setError(error);
    };
    
    wsCallbacks.add(priceCallback);
    connectionCallbacks.add(connectionCallback);
    errorCallbacks.add(errorCallback);
    
    console.log('📝 Registered callbacks. Total callbacks:', {
      price: wsCallbacks.size,
      connection: connectionCallbacks.size,
      error: errorCallbacks.size
    });
    
    setPrices({ ...currentPrices });
    setIsConnected(isConnectedGlobal);
    setError(currentError);
    
    if (!wsInstance || wsInstance.readyState === WebSocket.CLOSED) {
      console.log('🔌 Initiating WebSocket connection...');
      connectWebSocket();
    } else {
      console.log('🔌 WebSocket already exists, state:', wsInstance.readyState);
    }
    
    return () => {
      console.log('🧹 Cleaning up WebSocket hook...');
   
      wsCallbacks.delete(priceCallback);
      connectionCallbacks.delete(connectionCallback);
      errorCallbacks.delete(errorCallback);
      console.log('🧹 Removed callbacks. Remaining:', {
        price: wsCallbacks.size,
        connection: connectionCallbacks.size,
        error: errorCallbacks.size
      });
    };
  }, []);

  const subscribe = useCallback((assets: string[]) => {
    console.log('  Subscribe called with assets:', assets);
    
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      const subscribeMessage = JSON.stringify({
        type: 'subscribe',
        assets
      });
      
      console.log('Sending subscribe message:', subscribeMessage);
      wsInstance.send(subscribeMessage);
    } else {
      console.log('Cannot subscribe - WebSocket not ready. State:', wsInstance?.readyState);
    }
  }, []);

  const unsubscribe = useCallback((assets: string[]) => {
    console.log('  Unsubscribe called with assets:', assets);
    
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      const unsubscribeMessage = JSON.stringify({
        type: 'unsubscribe',
        assets
      });
      
      console.log('  Sending unsubscribe message:', unsubscribeMessage);
      wsInstance.send(unsubscribeMessage);
    } else {
      console.log('Cannot unsubscribe - WebSocket not ready. State:', wsInstance?.readyState);
    }
  }, []);

  useEffect(() => {
    console.log('📊 Prices state in component updated:', prices);
  }, [prices]);

  return {
    prices,
    isConnected,
    error,
    subscribe,
    unsubscribe
  };
}