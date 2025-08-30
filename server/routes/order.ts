import express from "express";
import { openOrder, getOrders } from "../controllers/order";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.post('/open',authMiddleware, openOrder);

router.get('/',authMiddleware, getOrders);

// router.post('/close',authMiddleware, closeOrder);

export default router;