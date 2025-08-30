import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { redisPub, tradeRedisSub } from "../lib/redis";
import { getUserBalance } from "../lib/balance";
import prisma from "@options-trading/db";
import { getExecutionPrice } from "../utils/getExecutionPrice";

export const openLeverageTrade = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { asset, type, margin, leverage, stopLoss, takeProfit } = req.body;

        if (!['buy', 'sell'].includes(type) || typeof margin !== 'number' || margin <= 0 || typeof leverage !== 'number' || leverage <= 0) {
            return res.status(411).json({ message: 'Incorrect inputs' });
        }

        const assetSymbol = `${asset.toUpperCase()}USDC`;
        const currentPriceData = await tradeRedisSub.get(`price:${assetSymbol}`);
        if (!currentPriceData) {
            res.status(400).json({
                message: `Price is not available for ${assetSymbol}`
            })
        }

        const priceInfo = JSON.parse(currentPriceData!);
        const decimals = priceInfo.decimals ?? 8;
        const rawPrice = type === 'buy' ? priceInfo.buyPrice : priceInfo.sellPrice;

        if (!rawPrice || rawPrice <= 0) {
            res.status(400).json({
                message: "Invalid market price"
            })
            return;
        }

        const openPriceNum = getExecutionPrice(type, priceInfo, decimals, "entry");
const openPrice = BigInt(Math.round(openPriceNum * Math.pow(10, decimals)));
        const stopLossNum = stopLoss ? Number(stopLoss) : null;
        const takeProfitNum = takeProfit ? Number(takeProfit) : null;


        console.log("DEBUG TRADE INPUT:", { asset, type, margin, leverage, stopLoss, takeProfit });
        console.log("DEBUG PRICE INFO:", priceInfo);
        console.log("DEBUG OPEN PRICE NUM:", openPriceNum);
        console.log("DEBUG STOPLOSS / TAKEPROFIT:", { stopLoss, takeProfit });


        const balance = getUserBalance(userId);
        const usdcDecimals = balance.usdc.decimals;
        const marginInt = BigInt(margin);

        if (balance.usdc.qty < marginInt) {
            res.status(400).json({
                message: 'Insufficient balance'
            })
            return;
        }

        balance.usdc.qty -= marginInt;

        if (stopLossNum) {
            console.log("CHECKING STOPLOSS:", stopLoss, "OPEN PRICE:", openPriceNum);
            if (type === 'buy' && stopLossNum >= openPriceNum) {
                return res.status(411).json({ message: 'StopLoss must be below open price for BUY' });
            }
            if (type === 'sell' && stopLossNum <= openPriceNum) {
                return res.status(411).json({ message: 'StopLoss must be above open price for SELL' });
            }
        }
        if (takeProfitNum) {
            if (type === 'buy' && takeProfitNum <= openPriceNum) {
                return res.status(411).json({ message: 'TakeProfit must be above open price for BUY' });
            }
            if (type === 'sell' && takeProfitNum >= openPriceNum) {
                return res.status(411).json({ message: 'TakeProfit must be below open price for SELL' });
            }
        }



        const marginUsd = margin / Math.pow(10, usdcDecimals);
        const notional = marginUsd * leverage;

        let liquidationPrice: number;
        if (type === "buy") {
            liquidationPrice =
                openPriceNum - (marginUsd * openPriceNum) / notional;
        } else {
            liquidationPrice =
                openPriceNum + (marginUsd * openPriceNum) / notional;
        }


        const order = await prisma.order.create({
            data: {
                userId,
                type,
                asset,
                margin: marginInt,
                marginDecimal: usdcDecimals,
                leverage,
                marketPrice: openPrice,
                decimals,
                status: 'OPEN',
                ordertype: 'LEVARAGE',
                stopLoss: stopLoss ? BigInt(Math.round(stopLoss * Math.pow(10, decimals))) : null,
                takeProfit: takeProfit ? BigInt(Math.round(takeProfit * Math.pow(10, decimals))) : null,
            }
        });

        await redisPub.sadd(`openTrades:${assetSymbol}`, order.id);
        await redisPub.hset(`trade:${order.id}`, {
            userId,
            type,
            asset: assetSymbol,
            margin: marginUsd.toString(),
            marginDecimals: usdcDecimals.toString(),
            leverage: leverage.toString(),
            decimals: decimals.toString(),
            openPrice: openPrice.toString(),
            stopLoss: stopLoss ? stopLoss.toString() : "",
            takeProfit: takeProfit ? takeProfit.toString() : "",
            liquidationPrice: liquidationPrice.toString(),
        });


        res.status(200).json({
            orderId: order.id
        });
        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create trade' });
        return;
    }
}

export const getOpenTrades = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const orders = await prisma.order.findMany({
            where: { userId, status: 'OPEN', ordertype: 'LEVARAGE' },
            orderBy: { createdAt: 'desc' }
        });

        const shaped = orders.map(o => ({
            orderId: o.id,
            type: o.type,
            margin: o.margin?.toString(),
            marginDecimals: o.marginDecimal,
            pnl: o.pnl,
            stopLoss: o.stopLoss,
            takeProfit: o.takeProfit,
            decimals: o.decimals,
            leverage: o.leverage,
            openPrice: o.marketPrice?.toString()
        }))

        res.status(200).json({ trades: shaped });
    } catch (error) {
        console.log("Failed to get open trades ", error);
    }
}


export const getClosedTrades = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const orders = await prisma.order.findMany({
            where: { userId, status: 'CLOSED', ordertype: 'LEVARAGE' },
            orderBy: { createdAt: 'desc' }
        });

        const shaped = orders.map(o => ({
            orderId: o.id,
            type: o.type,
            margin: o.margin?.toString(),
            marginDecimals: o.marginDecimal,
            pnl: o.pnl,
            stopLoss: o.stopLoss,
            takeProfit: o.takeProfit,
            decimals: o.decimals,
            leverage: o.leverage,
            openPrice: o.marketPrice?.toString()
        }))

        res.status(200).json({ trades: shaped });
    } catch (error) {
        console.log("Failed to get open trades ", error);
    }
}