import type { Request,Response } from "express";
import prisma from "@options-trading/db";
import { executeTrade } from "../lib/balance";

export const openOrder = async (req: Request,res: Response) => {
      try {
    const { userId, type, asset, qty, stopLoss, takeProfit, usdcAmount } = req.body;

      if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }
    
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
        status: 'OPEN'
      }
    });

    res.json({
      success: true,
      orderId: order.id,
      balance: {
        usdc: tradeResult.balance!.usdc,
        btc: tradeResult.balance!.btc,
        eth: tradeResult.balance!.eth,
        sol: tradeResult.balance!.sol,
      },
      order: {
        id: order.id,
        type: order.type,
        asset: order.asset,
        qty: Number(order.qty),
        stopLoss: order.stopLoss ? Number(order.stopLoss) : null,
        takeProfit: order.takeProfit ? Number(order.takeProfit) : null,
        userAmount: Number(order.userAmount),
        status: order.status,
        createdAt: order.createdAt
      },
      meta: {
        userId,
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

export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId parameter is required'
      });
    }
    
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

export const closeOrder = async (req: Request, res: Response) => {
  try {
    const { orderId, userId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
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
    
    const closedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CLOSED',
        closedAt: new Date()
      }
    });
    
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
        status: closedOrder.status,
        createdAt: closedOrder.createdAt,
        updatedAt: closedOrder.updatedAt,
        closedAt: closedOrder.closedAt
      },
      meta: {
        userId,
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


