export function getExecutionPrice(type: "buy" | "sell", priceInfo: any, decimals: number, side: "entry" | "exit"): number {
  const scale = Math.pow(10, decimals);

  if (side === "entry") {
    // open trade: buy at ask, sell at bid
    return type === "buy"
      ? priceInfo.buyPrice / scale
      : priceInfo.sellPrice / scale;
  } else {
    // close trade: buy exits at bid, sell exits at ask
    return type === "buy"
      ? priceInfo.sellPrice / scale
      : priceInfo.buyPrice / scale;
  }
}