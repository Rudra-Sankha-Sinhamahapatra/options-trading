import type { Response } from "express";
import { getUserBalance } from "../lib/balance";
import type { AuthRequest } from "../middleware/auth";

export const getBalance = async (req: AuthRequest,res: Response) => {
    try {
        const userId = req.userId!;

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
         console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    });
    }
};
