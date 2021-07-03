export class LogService {
  static log(payload: Record<string, unknown>): void {
    console.log(`${new Date().toISOString()} ${JSON.stringify(payload)}`);
  }
  static error(payload: Record<string, unknown>): void {
    console.error(`${new Date().toISOString()} ${JSON.stringify(payload)}`);
  }
}
