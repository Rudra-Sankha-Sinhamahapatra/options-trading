import prisma from "@options-trading/db";
import { getUserBalance } from "../lib/balance";
import { redisPub, redisSub } from "../lib/redis";
import { getExecutionPrice } from "../utils/getExecutionPrice";

function calculatePnL(
  type: "buy" | "sell",
  openPrice: number,
  closePrice: number,
  notional: number
): number {
  const priceDiff =
    type === "buy"
      ? (closePrice - openPrice) / openPrice
      : (openPrice - closePrice) / openPrice;

  return notional * priceDiff;
}

export async function watchPrices() {
  console.log("Starting price watcher...");
  await redisSub.psubscribe("bbo.*");

  redisSub.on("pmessage", async (_pattern, channel, message) => {
    try {
      const ch = String(channel);
      const msg = String(message);
      const assetSymbol = ch.split(".")[1];
      if (!assetSymbol) {
        console.warn("no asset symbol on watchPrice worker");
        return;
      }

      let priceData: any;
      try {
        priceData = JSON.parse(msg);
      } catch (err) {
        console.warn(`Invalid JSON on ${ch}:`, msg);
        return;
      }

      if (
        !priceData ||
        typeof priceData.decimals !== "number" ||
        (typeof priceData.buyPrice !== "number" &&
          typeof priceData.sellPrice !== "number")
      ) {
        console.warn(`Skipping bad price data on ${ch}:`, priceData);
        return;
      }

      const tradeIds = await redisPub.smembers(`openTrades:${assetSymbol}`);
      if (!tradeIds.length) return;

      for (const tradeId of tradeIds) {
        const trade = await redisPub.hgetall(`trade:${tradeId}`);
        if (!trade || !trade.openPrice) continue;

        const decimals = Number(trade.decimals);
        const openPrice = Number(trade.openPrice) / Math.pow(10, decimals);
        const margin = Number(trade.margin);
        const leverage = Number(trade.leverage);
        const notional = margin * leverage;

        const stopLoss = trade.stopLoss
          ? Number(trade.stopLoss) / Math.pow(10, decimals)
          : null;
        const takeProfit = trade.takeProfit
          ? Number(trade.takeProfit) / Math.pow(10, decimals)
          : null;

        const liquidationPrice = Number(trade.liquidationPrice);

        const executionPrice = getExecutionPrice(
          trade.type as "buy" | "sell",
          priceData,
          priceData.decimals,
          "exit"
        );

        let shouldClose = false;
        let reason = "";

        if (
          stopLoss &&
          ((trade.type === "buy" && executionPrice <= stopLoss) ||
            (trade.type === "sell" && executionPrice >= stopLoss))
        ) {
          shouldClose = true;
          reason = "StopLoss";
        }

        if (
          !shouldClose &&
          takeProfit &&
          ((trade.type === "buy" && executionPrice >= takeProfit) ||
            (trade.type === "sell" && executionPrice <= takeProfit))
        ) {
          shouldClose = true;
          reason = "TakeProfit";
        }

        if (
          !shouldClose &&
          ((trade.type === "buy" && executionPrice <= liquidationPrice) ||
            (trade.type === "sell" && executionPrice >= liquidationPrice))
        ) {
          shouldClose = true;
          reason = "Liquidation";
        }

        if (!shouldClose) continue;

        const pnl = calculatePnL(
          trade.type as "buy" | "sell",
          openPrice,
          executionPrice,
          notional
        );
        console.log("Calculated pnl", pnl);

        const balance = getUserBalance(trade.userId!);
        const usdcDecimals = balance.usdc.decimals;
        balance.usdc.qty += BigInt(
          Math.round((margin + pnl) * Math.pow(10, usdcDecimals))
        );

        try {
          await prisma.order.update({
            where: { id: tradeId },
            data: {
              status: "CLOSED",
              closePrice: BigInt(
                Math.round(executionPrice * Math.pow(10, decimals))
              ),
              pnl: BigInt(Math.round(pnl * Math.pow(10, usdcDecimals))),
              closedAt: new Date(),
            },
          });
        } catch (err: any) {
          if (err.code === "P2025") {
            console.warn(
              `Trade ${tradeId} already closed or missing, skipping`
            );
          } else {
            throw err;
          }
        }

        await redisPub.srem(`openTrades:${assetSymbol}`, tradeId);
        await redisPub.del(`trade:${tradeId}`);
        console.log(
          `Trade ${tradeId} closed at ${executionPrice} (${reason}), PnL = ${pnl}`
        );
      }
    } catch (error) {
      console.log(error);
    }
  });
}
