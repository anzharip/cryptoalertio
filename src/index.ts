import { Point } from "@influxdata/influxdb-client";
import * as dotenv from "dotenv";
import { merge } from "rxjs";
import {
  count,
  distinct,
  filter,
  map,
  mergeAll,
  windowTime,
} from "rxjs/operators";
import { KlineIntervals } from "./model/binance/klineIntervals";
import { Markets } from "./model/binance/markets";
import { BinanceWsService } from "./service/binanceWsService";
import { influxDBWritePoint } from "./service/influxDbService";
import { LogService } from "./service/logService";
import { calculatePercentageGain, sendChannelMessage } from "./utils/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).WebSocket = require("ws");
dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const channelName = process.env.TELEGRAM_CHANNEL_NAME;
const influxUrl = process.env.INFLUXDB_URL;
const influxToken = process.env.INFLUXDB_TOKEN;
const influxOrg = process.env.INFLUXDB_ORG;
const influxBucket = process.env.INFLUXDB_BUCKET;
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
if (!influxUrl)
  throw Error("Environment variable INFLUXDB_URL must be defined. ");
if (!influxToken)
  throw Error("Environment variable INFLUXDB_TOKEN must be defined. ");
if (!influxOrg)
  throw Error("Environment variable INFLUXDB_ORG must be defined. ");
if (!influxBucket)
  throw Error("Environment variable INFLUXDB_BUCKET must be defined. ");

(async () => {
  const socket = BinanceWsService.createWebSocket(
    KlineIntervals.interval1m,
    Markets.USDT
  );

  socket
    .then((socket) => {
      LogService.log({
        message: `Preparing WebSocket connection. `,
      });

      const metricObservable = socket.pipe(
        windowTime(1000),
        map((window) => window.pipe(count())),
        mergeAll()
      );

      metricObservable.subscribe(
        (message) => {
          const point = new Point("binance_ws_transactions").floatField(
            "tps",
            message
          );
          const defaultTag = { host: "host1" };
          influxDBWritePoint(
            influxUrl,
            influxToken,
            influxOrg,
            influxBucket,
            defaultTag,
            point
          );
          return;
        },
        (error) => LogService.error({ message: error }),
        () =>
          LogService.log({
            message: `Metric observable completed. `,
          })
      );

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
              LogService.log({
                message: `Processing message: ${JSON.stringify(message)}`,
              });

              const gain = calculatePercentageGain(
                Number(message.k.o),
                Number(message.k.c)
              );
              sendChannelMessage(botToken, channelName, message, {
                gain: gain,
              });
            }
          },
          (error) => LogService.error({ message: error }),
          () =>
            LogService.log({
              message: `WebSocket connection is closed. `,
            })
        );
      LogService.log({
        message: `Crypto Alert service started. `,
      });
    })

    .catch((error) => {
      LogService.error({ message: error });
    });
})();
