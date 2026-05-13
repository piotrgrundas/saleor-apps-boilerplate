import { z } from "zod";

import { saleorEnvSchema } from "@/infrastructure/integrations/saleor/env/schema";
import { appConfigEnvSchema, awsConfigSchema, baseConfigSchema } from "@/lib/config/schema";
import { prepareConfig } from "@/lib/config/util";

const configSchema = z
  .object({
    ALLOWED_DOMAINS: z.array(z.string()).default(["*"]),
    SERVICE: z.string().default("handler"),
  })
  .and(saleorEnvSchema)
  .and(baseConfigSchema)
  .and(awsConfigSchema)
  .and(appConfigEnvSchema);

export const APP_CONFIG = prepareConfig({
  name: "handler",
  schema: configSchema,
});
