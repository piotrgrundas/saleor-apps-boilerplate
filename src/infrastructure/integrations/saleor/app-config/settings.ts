import { z } from "zod";

import { saleorAppConfigSchema } from "./schema";

/**
 * Per-tenant merchant-facing settings. Written by the dashboard app, read by
 * any other app (e.g. handler) that needs to act on the merchant's behalf.
 *
 * Persisted as a field on the Saleor tenant config blob — see
 * `tenantAppConfigSchema` for the full shape stored by `AppConfigRepository`.
 */
export const appSettingsSchema = z.object({
  publicApiKey: z.string().default(""),
  privateApiKey: z.string().default(""),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

/**
 * Full shape of a single tenant's config as persisted by `AppConfigRepository`.
 * Combines Saleor connection data (`saleorAppConfigSchema`) with this app's
 * `appSettingsSchema`.
 */
export const tenantAppConfigSchema = saleorAppConfigSchema.extend({
  settings: appSettingsSchema.optional().default({ publicApiKey: "", privateApiKey: "" }),
});

export type TenantAppConfig = z.infer<typeof tenantAppConfigSchema>;
