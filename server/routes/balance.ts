import express from "express";
import { getBalance, trade } from "../controllers/balance";

const router = express.Router();

router.get('/', getBalance);

router.post('/trade', trade);

export default router;