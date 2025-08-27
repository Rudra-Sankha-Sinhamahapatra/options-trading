import type { Request,Response } from "express";
import { getUserBalance, executeTrade } from "../lib/balance";

export const getBalance = async (req:Request,res: Response) => {
    try {
        const userId = (req.query.userId as string);

        
    if (!userId) {
        res.status(400).json({
        success: false,
        error: 'userId parameter is required'
      });
      return;
    }

    const balance = getUserBalance(userId);

    res.status(200).json({
         success: true,
      balance: {
        usdc: balance.usdc,      
        btc: balance.btc,             
        eth: balance.eth,           
        sol: balance.sol,             
      },
      meta: {
        userId,
        timestamp: new Date().toISOString()
      }
    })

    } catch (error) {
         console.error('❌ Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    });
    }
};

export const trade = async (req: Request, res: Response) => {
  try {
    const { userId, asset, tradeType, assetQty, usdcAmount } = req.body;
    
    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }
    
    if (!['btc', 'eth', 'sol'].includes(asset)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset. Must be: btc, eth, or sol'
      });
    }
    
    if (!['buy', 'sell'].includes(tradeType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade type. Must be: buy or sell'
      });
    }

     if (typeof assetQty !== 'number' || assetQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Asset quantity must be a positive number'
      });
    }
    
    if (typeof usdcAmount !== 'number' || usdcAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'USDC amount must be a positive number'
      });
    }
    
    const result = executeTrade(userId, asset, tradeType, assetQty, usdcAmount);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      balance: {
        usdc: result.balance!.usdc,
        btc: result.balance!.btc,
        eth: result.balance!.eth,
        sol: result.balance!.sol,
      },
      trade: {
        asset,
        type: tradeType,
        assetQty,
        usdcAmount,
        timestamp: new Date().toISOString()
      },
      meta: {
        userId
      }
    });
    
  } catch (error) {
    console.error('❌ Error executing trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute trade'
    });
  }
};

