import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { LogService } from "./logService";

// You can generate a Token from the "Tokens Tab" in the UI
// const token =
//   "ls6aaTbgm3hdSD88Lym0IcOOOdCzxm4OGbPK1FJEgeXnL4gQyQreSJrGuBa76MMpyW2Y9yFvuNS08pNYFmXLoA==";
// const org = "anzhari.p@gmail.com";
// const bucket = "anzhari.p's Bucket";

export function influxDBWritePoint(
  url: string,
  token: string,
  org: string,
  bucket: string,
  defaultTags: Record<string, string>,
  point: Point
): void {
  const client = new InfluxDB({
    url,
    token,
  });

  const writeApi = client.getWriteApi(org, bucket);
  writeApi.useDefaultTags(defaultTags);

  writeApi.writePoint(point);
  writeApi
    .close()
    .then(() => {
      LogService.log({
        message: `Sending metric finished. `,
      });
    })
    .catch((e) => {
      LogService.error({ message: e });
    });
}
