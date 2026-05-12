import { z } from "zod";

import { appConfigSchema } from "@/domain/app-config/app-config";

export const appSettingsSchema = z.object({
  publicApiKey: z.string().default(""),
  privateApiKey: z.string().default(""),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const dashboardAppConfigSchema = appConfigSchema.extend({
  settings: appSettingsSchema.optional().default({ publicApiKey: "", privateApiKey: "" }),
});

export type DashboardAppConfig = z.infer<typeof dashboardAppConfigSchema>;

export const saleorAppConfigSchema = z
  .object({
    SALEOR_URL: z.string().url(),
  })
  .transform((config) => {
    const url = new URL(config.SALEOR_URL);
    return {
      ...config,
      SALEOR_DOMAIN: url.hostname,
      SALEOR_GRAPHQL_URL: `${config.SALEOR_URL}/graphql/`,
    };
  });
