import { z } from "zod";

export const saleorEnvSchema = z
  .object({
    SALEOR_URL: z.url().min(1),
  })
  .transform((config) => {
    const url = new URL(config.SALEOR_URL);
    return {
      ...config,
      SALEOR_DOMAIN: url.hostname,
      SALEOR_UI_APP_TOKEN: z.string().default(""),
      SALEOR_GRAPHQL_URL: `${config.SALEOR_URL}/graphql/`,
    };
  });

export type SaleorEnv = z.infer<typeof saleorEnvSchema>;
