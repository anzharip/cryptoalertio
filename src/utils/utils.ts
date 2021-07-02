import { KlineStreamPayload } from "src/model/binance/klineStreamPayload";
import fetch from "node-fetch";

export function calculatePercentageGain(
  initial: number,
  final: number
): number {
  return Number(((final / initial - 1) * 100).toFixed(2));
}

export function sendChannelMessage(
  botToken: string,
  channelName: string,
  message: KlineStreamPayload,
  payload: { gain: number }
): void {
  const pairName = message.s;
  const channelMessage = `Symbol%3A%20${pairName}%0AGain%3A%20${payload.gain}%25%0A24%20Hour%20Volume%3A%20n%2Fa%0ABinance%3A%20https%3A%2F%2Fwww.binance.com%2Fen%2Ftrade%2F${pairName}%0ATradingView%3A%20https%3A%2F%2Fwww.tradingview.com%2Fchart%3Fsymbol%3DBINANCE%3A${pairName}`;
  const telegramBotUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${channelName}&text=${channelMessage}`;
  fetch(telegramBotUrl, {
    method: "GET",
    headers: {},
  }).catch((err) => {
    console.error(err);
  });
}
