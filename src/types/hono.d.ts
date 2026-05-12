import type { Logger } from "@/domain/ports/logger";

declare module "hono" {
  interface ContextVariableMap {
    origin: string;
    logger: Logger;
    saleorDomain: string;
    saleorApiUrl: string;
    saleorEvent: string;
  }
}
