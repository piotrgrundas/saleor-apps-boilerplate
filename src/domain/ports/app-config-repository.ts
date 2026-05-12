import type { SaleorAppConfig } from "@/infrastructure/integrations/saleor/app-config/schema";

import type { Context } from "../context";
import type { AsyncResult } from "../errors/result";
import type { AppConfigErrorCode } from "../errors/scopes/app-config";

export type AppConfigRepository = {
  get(saleorDomain: string, ctx: Context): AsyncResult<SaleorAppConfig | null, AppConfigErrorCode>;
  set(
    input: { saleorDomain: string; config: SaleorAppConfig },
    ctx: Context,
  ): AsyncResult<void, AppConfigErrorCode>;
  delete(saleorDomain: string, ctx: Context): AsyncResult<void, AppConfigErrorCode>;
};
