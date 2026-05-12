import type { SaleorAppConfig } from "@/infrastructure/integrations/saleor/app-config/schema";

import type { AsyncResult } from "../errors/result";
import type { AppConfigErrorCode } from "../errors/scopes/app-config";

export type AppConfigRepository = {
  get(saleorDomain: string): AsyncResult<SaleorAppConfig | null, AppConfigErrorCode>;
  set(input: { saleorDomain: string; config: SaleorAppConfig }): AsyncResult<void, AppConfigErrorCode>;
  delete(saleorDomain: string): AsyncResult<void, AppConfigErrorCode>;
};
