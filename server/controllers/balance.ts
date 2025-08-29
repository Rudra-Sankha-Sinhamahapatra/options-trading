import type { Response } from "express";
import { getUserBalance } from "../lib/balance";
import type { AuthRequest } from "../middleware/auth";
import { sendJsonBigInt } from "../utils/jsonbigint";


export const getBalance = async (req: AuthRequest, res: Response) => {
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
    sendJsonBigInt(res, { success: true, balance, meta: { timestamp: new Date(), userId } });
    return;
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    });
  }
};
