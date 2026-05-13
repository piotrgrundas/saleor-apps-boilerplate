import type { RequestIdVariables } from "hono/request-id";

import type { Logger } from "@/domain/ports/logger";

declare module "hono" {
  interface ContextVariableMap extends RequestIdVariables {
    origin: string;
    baseUrl: string;
    logger: Logger;
    saleorDomain: string;
    saleorApiUrl: string;
    saleorEvent: string;
  }
}
