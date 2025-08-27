import express from "express"
import { getAssets, getCandles, getIntervals, getStats } from "../controllers/candles";

const router = express.Router();

router.get('/', getCandles);

router.get('/assets', getAssets);

router.get('/intervals', getIntervals);

router.get('/stats', getStats);

export default router ;