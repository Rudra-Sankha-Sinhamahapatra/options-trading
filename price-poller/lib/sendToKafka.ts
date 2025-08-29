import { producer, TOPICS } from "@options-trading/backend-common";

export async function sendOHLCToKafka(ohlcData: any) {
    try {
        await producer.send({
            topic: TOPICS.OHLC_DATA,
            messages: [
                {
         key: `${ohlcData.asset}-${ohlcData.interval}`,
          value: JSON.stringify(ohlcData),
          timestamp: ohlcData.openTime.toString()
                }
            ]
        });
        
      console.log(`Sent to Kafka: ${ohlcData.asset} ${ohlcData.interval}`);
  } catch (error) {
    console.error("Error sending OHLC to Kafka:", error);
  }
}