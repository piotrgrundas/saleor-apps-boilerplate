import type { AppConfig } from "../objects/app-config";
import type { AppConfigErrorCode } from "../objects/error";
import type { AsyncDomainResult } from "../objects/result";

export interface AppConfigRepository {
  get(saleorDomain: string): AsyncDomainResult<AppConfig | null, AppConfigErrorCode>;
  set(saleorDomain: string, config: AppConfig): AsyncDomainResult<void, AppConfigErrorCode>;
  delete(saleorDomain: string): AsyncDomainResult<void, AppConfigErrorCode>;
}
