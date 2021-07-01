import * as dotenv from "dotenv";
import { filter } from "rxjs/operators";
import { KlineIntervals } from "./model/binance/klineIntervals";
import { Markets } from "./model/binance/markets";
import { BinanceWsService } from "./service/binanceWsService";
import { calculatePercentageGain, sendChannelMessage } from "./utils/utils";

(global as any).WebSocket = require("ws");
dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const channelName = process.env.TELEGRAM_CHANNEL_NAME;
const minPercentageGain = process.env.MIN_PERCENTAGE_GAIN
  ? Number(process.env.MIN_PERCENTAGE_GAIN)
  : 3;
const minPercentageLoss = process.env.MIN_PERCENTAGE_LOSS
  ? Number(process.env.MIN_PERCENTAGE_LOSS)
  : -3;

if (!botToken)
  throw Error("Environment variable TELEGRAM_BOT_TOKEN must be defined. ");
if (!channelName)
  throw Error("Environment variable TELEGRAM_CHANNEL_NAME must be defined. ");

(async () => {
  const socket = BinanceWsService.createWebSocket(
    KlineIntervals.interval1m,
    Markets.USDT
  );

  socket
    .then((socket) => {
      console.log("Preparing WebSocket connection. ");
      const binanceWsObservable = socket.pipe(
        filter((message) => {
          if ("e" in message) {
            if (message.e !== "kline") return false;
          }
          return true;
        })
      );
      const btcUsdtObservable = binanceWsObservable.pipe(
        filter((message) => {
          if ("e" in message) {
            if (message.s !== "BTCUSDT") return false;
          }
          return true;
        })
      );

      binanceWsObservable.subscribe(
        (message) => {
          if ("s" in message) {
            const gain = calculatePercentageGain(
              Number(message.k.o),
              Number(message.k.c)
            );
            if (gain >= minPercentageGain || gain <= minPercentageLoss) {
              sendChannelMessage(botToken, channelName, message, {
                gain: gain,
              });
            }
          }
        },
        (error) => console.log(error),
        () => console.log("WebSocket connection is closed. ")
      );

      btcUsdtObservable.subscribe(
        (message) => {
          if ("s" in message) {
            const gain = calculatePercentageGain(
              Number(message.k.o),
              Number(message.k.c)
            );
            if (gain >= 0.5 || gain <= -0.5) {
              sendChannelMessage(botToken, channelName, message, {
                gain: gain,
              });
            }
          }
        },
        (error) => console.log(error),
        () => console.log("WebSocket connection is closed. ")
      );

      console.log("Crypto Alert service started. ");
    })

    .catch((error) => {
      console.log(error);
    });
})();
