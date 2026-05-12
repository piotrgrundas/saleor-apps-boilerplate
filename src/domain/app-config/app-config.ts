import { z } from "zod";

export const appConfigSchema = z.looseObject({
  saleorDomain: z.string(),
  authToken: z.string(),
  saleorAppId: z.string(),
  saleorApiUrl: z.string().url(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfigMapSchema = z.record(z.string(), appConfigSchema);

export type AppConfigMap = z.infer<typeof appConfigMapSchema>;
