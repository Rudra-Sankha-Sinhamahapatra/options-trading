import type { Response } from "express";
import prisma from "@options-trading/db";
import { executeTrade } from "../lib/balance";
import type { AuthRequest } from "../middleware/auth";
import { Decimal } from "@prisma/client/runtime/library";
import { redisSub } from "../lib/redis";

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

    let currentPrice: number;
    try {
      const priceInfo = JSON.parse(currentPriceData);
      currentPrice = priceInfo.price;
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Error retrieving current market price"
      });
    }

    const tradeResult = executeTrade(userId, asset, type, qty, usdcAmount);

    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: tradeResult.error
      });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        type,
        asset,
        qty,
        stopLoss: stopLoss || null,
        takeProfit: takeProfit || null,
        userAmount: usdcAmount,
        marketPrice: currentPrice,
        closePrice: new Decimal(currentPrice),
        status: 'CLOSED',
        closedAt: new Date()
      }
    });

    console.log(`✅ Order opened: ${type} ${qty} ${asset} for user ${userId}`);

    res.json({
      success: true,
      orderId: order.id,
      balance: tradeResult.balance!,
      order: {
        id: order.id,
        type: order.type,
        asset: order.asset,
        qty: Number(order.qty),
        stopLoss: order.stopLoss ? Number(order.stopLoss) : null,
        takeProfit: order.takeProfit ? Number(order.takeProfit) : null,
        userAmount: Number(order.userAmount),
        marketPrice: currentPrice,
        status: order.status,
        createdAt: order.createdAt
      },
      meta: {
        userId,
        currentPrice,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error opening order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to open order'
    });
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        type: order.type,
        asset: order.asset,
        qty: Number(order.qty),
        stopLoss: order.stopLoss ? Number(order.stopLoss) : null,
        takeProfit: order.takeProfit ? Number(order.takeProfit) : null,
        userAmount: Number(order.userAmount),
        marketPrice: order.marketPrice ? Number(order.marketPrice) : null,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        closedAt: order.closedAt
      })),
      meta: {
        userId,
        count: orders.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error getting orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orders'
    });
  }
};

export const closeOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required'
      });
    }
    
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: userId,
        status: 'OPEN'
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or already closed'
      });
    }

    const assetSymbol = `${order.asset.toUpperCase()}USDC`;
    const currentPriceData = await redisSub.get(`price:${assetSymbol}`);
    let closePrice = null;
    
    if (currentPriceData) {
      try {
        const priceInfo = JSON.parse(currentPriceData);
        closePrice = priceInfo.price;
      } catch (error) {
        console.error('Error parsing close price:', error);
      }
    }
    
    const closedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CLOSED',
        closePrice: closePrice,
        closedAt: new Date()
      }
    });

    console.log(`✅ Order closed: ${order.type} ${order.qty} ${order.asset} for user ${userId}`);
    
    res.json({
      success: true,
      order: {
        id: closedOrder.id,
        type: closedOrder.type,
        asset: closedOrder.asset,
        qty: Number(closedOrder.qty),
        stopLoss: closedOrder.stopLoss ? Number(closedOrder.stopLoss) : null,
        takeProfit: closedOrder.takeProfit ? Number(closedOrder.takeProfit) : null,
        userAmount: Number(closedOrder.userAmount),
        marketPrice: closedOrder.marketPrice ? Number(closedOrder.marketPrice) : null,
        closePrice: closedOrder.closePrice ? Number(closedOrder.closePrice) : null,
        status: closedOrder.status,
        createdAt: closedOrder.createdAt,
        updatedAt: closedOrder.updatedAt,
        closedAt: closedOrder.closedAt
      },
      meta: {
        userId,
        closePrice,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error closing order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close order'
    });
  }
};


