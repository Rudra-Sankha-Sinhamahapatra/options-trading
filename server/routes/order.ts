import express from "express";
import { openOrder, getOrders, closeOrder } from "../controllers/order";

const router = express.Router();

router.post('/open', openOrder);

router.get('/', getOrders);

router.post('/close', closeOrder);

export default router;