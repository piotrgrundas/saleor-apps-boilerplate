import type { SaleorAppConfig } from "@/infrastructure/integrations/saleor/app-config/schema";

import type { Context } from "../context";
import type { AsyncResult } from "../errors/result";
import type { AppConfigErrorCode } from "../errors/scopes/app-config";

/**
 * Construction options shared by all `AppConfigRepository` adapters.
 *
 * Repositories store one config object per Saleor tenant, keyed by domain.
 * Concrete adapters decide how `configPath` is interpreted:
 *   - Parameter Store: tree root, with tenants at `${configPath}/${saleorDomain}`
 *   - Secrets Manager: secret name containing a `{ [saleorDomain]: config }` map
 */
export type AppConfigRepositoryOptions = {
  /**
   * Adapter-specific location of the config store. See type-level doc for
   * how each adapter interprets this value.
   */
  configPath: string;
  /**
   * Optional encryption-key identifier for adapters that support
   * server-side encryption at rest. Omit to use the provider-managed
   * default (e.g. AWS-managed `alias/aws/ssm` for SSM SecureString).
   *
   * Cloud-provider region + credentials are resolved by the underlying
   * SDK from the runtime environment (e.g. `AWS_REGION`, IAM role).
   */
  kmsKeyId?: string;
};

export type AppConfigRepository = {
  get(saleorDomain: string, ctx: Context): AsyncResult<SaleorAppConfig | null, AppConfigErrorCode>;
  set(
    input: { saleorDomain: string; config: SaleorAppConfig },
    ctx: Context,
  ): AsyncResult<void, AppConfigErrorCode>;
  delete(saleorDomain: string, ctx: Context): AsyncResult<void, AppConfigErrorCode>;
};
