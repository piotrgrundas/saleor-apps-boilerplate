import { z } from "zod";

import { awsConfigSchema, baseConfigSchema } from "@/lib/config/schema";
import { prepareConfig } from "@/lib/config/util";
import { saleorEnvSchema } from "@/infrastructure/integrations/saleor/env/schema";

const configSchema = z
  .object({
    SERVICE: z.string().default("dashboard"),
    SECRET_MANAGER_APP_CONFIG_PATH: z.string(),
  })
  .and(saleorEnvSchema)
  .and(baseConfigSchema)
  .and(awsConfigSchema);

export const APP_CONFIG = prepareConfig({
  name: "dashboard",
  schema: configSchema,
});
