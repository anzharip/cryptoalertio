import * as dotenv from "dotenv";
import { merge } from "rxjs";
import { distinct, filter, map, mergeAll, windowTime } from "rxjs/operators";
import { KlineIntervals } from "./model/binance/klineIntervals";
import { Markets } from "./model/binance/markets";
import { BinanceWsService } from "./service/binanceWsService";
import { calculatePercentageGain, sendChannelMessage } from "./utils/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
const btcMinPercentageGain = process.env.BTC_MIN_PERCENTAGE_GAIN
  ? Number(process.env.BTC_MIN_PERCENTAGE_GAIN)
  : 0.5;
const btcMinPercentageLoss = process.env.BTC_MIN_PERCENTAGE_LOSS
  ? Number(process.env.BTC_MIN_PERCENTAGE_LOSS)
  : -0.5;
const windowDuration = process.env.WINDOW_DURATION
  ? Number(process.env.WINDOW_DURATION)
  : 5000;

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

      const btcFilterGain = btcUsdtObservable.pipe(
        filter((message) => {
          if ("s" in message) {
            const gain = calculatePercentageGain(
              Number(message.k.o),
              Number(message.k.c)
            );
            if (gain >= btcMinPercentageGain || gain <= btcMinPercentageLoss) {
              return true;
            }
          }
          return false;
        })
      );

      const filterGain = binanceWsObservable.pipe(
        filter((message) => {
          if ("s" in message) {
            const gain = calculatePercentageGain(
              Number(message.k.o),
              Number(message.k.c)
            );
            if (gain >= minPercentageGain || gain <= minPercentageLoss) {
              return true;
            }
          }
          return false;
        })
      );

      merge(filterGain, btcFilterGain)
        .pipe(
          windowTime(windowDuration),
          map((window) =>
            window.pipe(
              distinct((message) => {
                if ("e" in message) {
                  return message.s;
                }
              })
            )
          ),
          mergeAll()
        )
        .subscribe(
          (message) => {
            if ("e" in message) {
              console.log(
                `${new Date().toISOString()} Processing message: ${JSON.stringify(
                  message
                )}`
              );
              const gain = calculatePercentageGain(
                Number(message.k.o),
                Number(message.k.c)
              );
              sendChannelMessage(botToken, channelName, message, {
                gain: gain,
              });
            }
          },
          (error) => console.error(error),
          () => console.log("WebSocket connection is closed. ")
        );
      console.log("Crypto Alert service started. ");
    })

    .catch((error) => {
      console.error(error);
    });
})();
