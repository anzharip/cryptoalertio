import fetch from "node-fetch";
import { webSocket, WebSocketSubject } from "rxjs/webSocket";
import { CONSTANTS } from "../constants";
import { KlineIntervals } from "../model/binance/klineIntervals";
import { KlineStreamPayload } from "../model/binance/klineStreamPayload";
import { Markets } from "../model/binance/markets";
import { StreamMethod } from "../model/binance/streamMethod";
import { StreamRequest } from "../model/binance/streamRequest";

export class BinanceWsService {
  static async createWebSocket(
    interval: KlineIntervals,
    market: Markets
  ): Promise<WebSocketSubject<KlineStreamPayload | StreamRequest>> {
    const exchangeInfo = await fetch(
      `${CONSTANTS.binanceHttpUrl}/api/v3/exchangeInfo`,
      {
        method: "GET",
      }
    );

    const symbols = (await exchangeInfo.json()).symbols;
    const params = [];
    for (const symbol of symbols) {
      if (symbol.symbol.includes(market)) {
        params.push(`${symbol.symbol.toLowerCase()}@kline_${interval}`);
      }
    }
    params.push("!ticker@arr");

    const streamUrl = `${CONSTANTS.binanceWsUrl}/ws`;
    const streamRequest: StreamRequest = {
      method: StreamMethod.SUBSCRIBE,
      params: params,
      id: 1,
    };

    const subject = webSocket<KlineStreamPayload | StreamRequest>(streamUrl);
    subject.next(streamRequest);

    return subject;
  }
}
