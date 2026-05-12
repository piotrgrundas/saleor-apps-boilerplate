import { z } from "zod";

export const saleorAppConfigSchema = z.looseObject({
  saleorDomain: z.string(),
  authToken: z.string(),
  saleorAppId: z.string(),
  saleorApiUrl: z.string().url(),
});

export type SaleorAppConfig = z.infer<typeof saleorAppConfigSchema>;

export const saleorAppConfigMapSchema = z.record(z.string(), saleorAppConfigSchema);

export type SaleorAppConfigMap = z.infer<typeof saleorAppConfigMapSchema>;
