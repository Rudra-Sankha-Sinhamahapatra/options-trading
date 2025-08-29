import type { Response } from "express";
import prisma from "@options-trading/db";
import { executeTrade } from "../lib/balance";
import type { AuthRequest } from "../middleware/auth";
import { redisSub } from "../lib/redis";
import { sendJsonBigInt } from "../utils/jsonbigint";

const toScaledInt = (value: number, decimals: number) => BigInt(Math.round(value * Math.pow(10,decimals)));

const fromScaledInt = (raw: bigint | number | null | undefined,
  decimals: number
) => raw == null ? null : Number(raw) / Math.pow(10,decimals)

const USD_DECIMALS = 2;

export const openOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { type, asset, qty, stopLoss, takeProfit, usdcAmount } = req.body;

    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be: buy or sell'
      });
    }

    if (!['btc', 'eth', 'sol'].includes(asset)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset. Must be: btc, eth, or sol'
      });
    }

    if (typeof qty !== 'number' || qty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive number'
      });
    }

    if (typeof usdcAmount !== 'number' || usdcAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'USDC amount must be a positive number'
      });
    }


    const assetSymbol = `${asset.toUpperCase()}USDC`;
    const currentPriceData = await redisSub.get(`price:${assetSymbol}`);

    if (!currentPriceData) {
      return res.status(400).json({
        success: false,
        error: `Current market price not available for ${assetSymbol}`
      });
    }

    let priceInfo = JSON.parse(currentPriceData);
    const decimals: number = priceInfo.decimals ?? 0;
    const scale = Math.pow(10,decimals);

    const rawBid: number | undefined = priceInfo.sellPrice;
    const rawAsk: number | undefined = priceInfo.buyPrice;

    if (typeof rawBid !== 'number' || typeof rawAsk !== 'number' || rawBid <= 0 || rawAsk <= 0) {
      return res.status(400).json({ success: false, error: `Invalid market prices for ${assetSymbol}` });
    }

    const bid = rawBid / scale;
    const ask = rawAsk / scale;

    const rawExecutionPrice = type === 'buy' ? rawAsk : rawBid; 
    const executionPrice = rawExecutionPrice / scale; 

    if (executionPrice <= 0) {
      return res.status(400).json({ success: false, error: `Invalid ${type === 'buy' ? 'ask' : 'bid'} price for ${assetSymbol}` });
    }

    const actualTradeAmount = qty * executionPrice;

    const tradeResult = executeTrade(userId, asset, type, qty, actualTradeAmount);

    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: tradeResult.error
      });
    }

    const usdcAmountInt = toScaledInt(usdcAmount,USD_DECIMALS);

    const order = await prisma.order.create({
      data: {
        userId,
        type,
        asset,
        qty,
        stopLoss:  stopLoss,
        takeProfit: takeProfit,

        userAmount: usdcAmountInt,
        userAmountDecimal: USD_DECIMALS,

         marketPrice: BigInt(rawExecutionPrice),
        closePrice: BigInt(rawExecutionPrice),
        decimals,
        status: 'CLOSED',
        closedAt: new Date()
      }
    });

    console.log(`Order opened: ${type} ${qty} ${asset} for user ${userId}`);

      sendJsonBigInt(res,{
      success: true,
      message: 'Trade executed successfully',
      orderId: order.id,
      executionPrice: executionPrice,
      balance: tradeResult.balance!,
      trade: {
        id: order.id,
        type: order.type,
        asset: order.asset,
        qty: Number(order.qty),
        executionPrice: executionPrice,
        amount: actualTradeAmount,
        status: 'CLOSED',
        executedAt: order.closedAt,
        priceType: type === 'buy' ? 'ask' : 'bid'
      },
      priceDetails: {
        bid, ask,
        spread: ask - bid,
        executionPrice,
        priceType: type === 'buy' ? 'ask' : 'bid'
      },
      meta: {decimals}
    });


  } catch (error) {
    console.error('Error opening order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to open order'
    });
  }
}

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const shaped = orders.map(o => {
      const d = o.decimals ?? 0;
      const userDec = o.userAmountDecimal ?? USD_DECIMALS;

      return {
        id: o.id,
        type: o.type,
        asset: o.asset,
        qty: Number(o.qty),

        stopLoss: o.stopLoss != null ? fromScaledInt(o.stopLoss as unknown as bigint, d) : null,
        takeProfit: o.takeProfit != null ? fromScaledInt(o.takeProfit as unknown as bigint, d) : null,
        
        userAmount: o.userAmount != null ? fromScaledInt(o.userAmount as unknown as bigint, userDec) : null,
        userAmountDecimal: userDec,

        marketPrice: o.marketPrice != null ? fromScaledInt(o.marketPrice as unknown as bigint, d) : null,
        closePrice:  o.closePrice  != null ? fromScaledInt(o.closePrice  as unknown as bigint, d) : null,

        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        closedAt: o.closedAt
      }
    })

    res.json({
      success: true,
      orders: shaped,
      meta: {
        userId,
        count: orders.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orders'
    });
  }
}