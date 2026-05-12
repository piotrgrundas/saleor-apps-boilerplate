import type { AppConfig } from "../app-config/app-config";
import type { AsyncResult } from "../errors/result";
import type { AppConfigErrorCode } from "../errors/scopes/app-config";

export type AppConfigRepository = {
  get(saleorDomain: string): AsyncResult<AppConfig | null, AppConfigErrorCode>;
  set(input: { saleorDomain: string; config: AppConfig }): AsyncResult<void, AppConfigErrorCode>;
  delete(saleorDomain: string): AsyncResult<void, AppConfigErrorCode>;
};
