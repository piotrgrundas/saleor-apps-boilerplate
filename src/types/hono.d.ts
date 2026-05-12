import type { Logger } from "@/domain/ports/logger";

declare module "hono" {
  interface ContextVariableMap {
    origin: string;
    baseUrl: string;
    logger: Logger;
    saleorDomain: string;
    saleorApiUrl: string;
    saleorEvent: string;
  }
}
