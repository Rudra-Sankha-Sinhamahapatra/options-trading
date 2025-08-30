import express from "express";
import { openLeverageTrade, getClosedTrades, getOpenTrades } from "../controllers/trade"
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.post('/open', authMiddleware, openLeverageTrade);

router.get('/', authMiddleware, getOpenTrades);

router.post('/close', authMiddleware, getClosedTrades);

export default router;