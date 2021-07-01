import { StreamMethod } from "./streamMethod";

export interface StreamRequest {
  method: StreamMethod;
  params: string[];
  id: number;
}
