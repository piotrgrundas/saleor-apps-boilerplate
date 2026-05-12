import { z } from "zod";

import { saleorAppConfigSchema } from "@/infrastructure/integrations/saleor/app-config/schema";

export const appSettingsSchema = z.object({
  publicApiKey: z.string().default(""),
  privateApiKey: z.string().default(""),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const dashboardAppConfigSchema = saleorAppConfigSchema.extend({
  settings: appSettingsSchema.optional().default({ publicApiKey: "", privateApiKey: "" }),
});

export type DashboardAppConfig = z.infer<typeof dashboardAppConfigSchema>;
