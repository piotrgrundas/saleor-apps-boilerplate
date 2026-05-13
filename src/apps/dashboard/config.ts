import { z } from "zod";

import { saleorEnvSchema } from "@/infrastructure/integrations/saleor/env/schema";
import { appConfigEnvSchema, awsConfigSchema, baseConfigSchema } from "@/lib/config/schema";
import { prepareConfig } from "@/lib/config/util";

const configSchema = z
  .object({
    SERVICE: z.string().default("dashboard"),
  })
  .and(saleorEnvSchema)
  .and(baseConfigSchema)
  .and(awsConfigSchema)
  .and(appConfigEnvSchema);

export const APP_CONFIG = prepareConfig({
  name: "dashboard",
  schema: configSchema,
});
