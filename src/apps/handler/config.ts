import { z } from "zod";

import { awsConfigSchema, baseConfigSchema } from "@/lib/config/schema";
import { prepareConfig } from "@/lib/config/util";
import { saleorEnvSchema } from "@/infrastructure/integrations/saleor/env/schema";

const configSchema = z
  .object({
    ALLOWED_DOMAINS: z.array(z.string()).default(["*"]),
    SERVICE: z.string().default("handler"),
    // SECRET_MANAGER_APP_CONFIG_PATH: z.string(),
    SENTRY_DSN: z.url().optional(),
  })
  // .and(saleorEnvSchema)
  .and(baseConfigSchema)
  .and(awsConfigSchema);

export const APP_CONFIG = prepareConfig({
  name: "handler",
  schema: configSchema,
});
