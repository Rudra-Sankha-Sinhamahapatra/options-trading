'use client';

import { useState, useEffect, useCallback } from 'react';
import { config } from '@/config/config';

interface PriceUpdate {
  asset: string;
  price: number;
  timestamp: number;
  change24h?: number;
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
        console.error('❌ Invalid numeric values in BBO data:', { timestamp, bid, ask, bidQty, askQty });
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
      
      console.log('✅ Successfully parsed price update:', priceUpdate);
      return priceUpdate;
    } else {
      console.log('❌ Invalid BBO format - expected "bbo SYMBOL TIMESTAMP BID BIDQTY ASK ASKQTY", got:', parts);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error parsing BBO data:', error, 'Message was:', message);
    return null;
  }
};

const notifyPriceUpdate = () => {
  wsCallbacks.forEach(callback => {
    try {
      callback({ ...currentPrices }); 
    } catch (error) {
      console.error('❌ Error in price update callback:', error);
    }
  });
};

const notifyConnection = (connected: boolean) => {
  console.log('📢 Notifying connection status:', connected, 'to', connectionCallbacks.size, 'subscribers');
  connectionCallbacks.forEach(callback => {
    try {
      callback(connected);
    } catch (error) {
      console.error('❌ Error in connection callback:', error);
    }
  });
};

const notifyError = (error: string | null) => {
  console.log('📢 Notifying error:', error, 'to', errorCallbacks.size, 'subscribers');
  errorCallbacks.forEach(callback => {
    try {
      callback(error);
    } catch (error) {
      console.error('❌ Error in error callback:', error);
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
      console.log('✅ WebSocket connected successfully');
      isConnectedGlobal = true;
      currentError = null;
      notifyConnection(true);
      notifyError(null);
    };

    wsInstance.onmessage = (event) => {
      const rawMessage = event.data;
      console.log('📨 Received raw WebSocket message:', rawMessage);
      
      try {
        let priceUpdate: PriceUpdate | null = null;
        
        if (typeof rawMessage === 'string' && (rawMessage.trim().startsWith('{') || rawMessage.trim().startsWith('['))) {
          try {
            const data = JSON.parse(rawMessage);
            console.log('📊 Successfully parsed JSON data:', data);
            
            if (data.type === 'connected') {
              console.log('🎉 Received connection confirmation:', data.message);
              return;
            }
            
            if (data.type === 'price_update') {
              priceUpdate = {
                asset: data.asset,
                price: data.price,
                timestamp: data.timestamp,
                change24h: data.change24h,
                bid: data.bid,
                ask: data.ask,
                bidQty: data.bidQty,
                askQty: data.askQty
              };
              console.log('💰 Extracted price update from JSON:', priceUpdate);
            }
          } catch (jsonError) {
            console.log('❌ JSON parsing failed:', jsonError);

          }
        }
        
        if (!priceUpdate && typeof rawMessage === 'string') {
          console.log('🔄 Attempting BBO parsing...');
          priceUpdate = parseBBOData(rawMessage);
        }
        
        if (priceUpdate) {
          console.log('✅ Successfully parsed price update:', priceUpdate);
          console.log('💰 Processing price update for asset:', priceUpdate.asset);
          console.log('💰 Price data:', { 
            price: priceUpdate.price, 
            bid: priceUpdate.bid, 
            ask: priceUpdate.ask 
          });
          
          currentPrices = {
            ...currentPrices,
            [priceUpdate.asset]: priceUpdate
          };
          
          console.log('💰 Updated global prices. Total assets:', Object.keys(currentPrices).length);
          console.log('💰 Current prices object:', currentPrices);
          
          notifyPriceUpdate();
        } else {
          console.log('❌ Could not parse message as JSON or BBO format:', rawMessage);
          console.log('❌ Raw message length:', rawMessage.length);
          console.log('❌ Raw message first 100 chars:', rawMessage.substring(0, 100));
        }
        
      } catch (err) {
        console.error('❌ Unexpected error processing WebSocket message:', err);
      }
    };

    wsInstance.onclose = (event) => {
      console.log('❌ WebSocket disconnected - Code:', event.code, 'Reason:', event.reason);
      isConnectedGlobal = false;
      notifyConnection(false);

      setTimeout(() => {
        console.log('🔄 Attempting to reconnect WebSocket...');
        connectWebSocket();
      }, 2000);
    };

    wsInstance.onerror = (error) => {
      console.error('❌ WebSocket connection error:', error);
      currentError = 'WebSocket connection error';
      notifyError(currentError);
    };

  } catch (err) {
    console.error('❌ Failed to create WebSocket connection:', err);
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
    console.log('📡 Subscribe called with assets:', assets);
    
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      const subscribeMessage = JSON.stringify({
        type: 'subscribe',
        assets
      });
      
      console.log('📡 Sending subscribe message:', subscribeMessage);
      wsInstance.send(subscribeMessage);
    } else {
      console.log('❌ Cannot subscribe - WebSocket not ready. State:', wsInstance?.readyState);
    }
  }, []);

  const unsubscribe = useCallback((assets: string[]) => {
    console.log('📡 Unsubscribe called with assets:', assets);
    
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      const unsubscribeMessage = JSON.stringify({
        type: 'unsubscribe',
        assets
      });
      
      console.log('📡 Sending unsubscribe message:', unsubscribeMessage);
      wsInstance.send(unsubscribeMessage);
    } else {
      console.log('❌ Cannot unsubscribe - WebSocket not ready. State:', wsInstance?.readyState);
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