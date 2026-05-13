import { z } from "zod";

export const baseConfigSchema = z.object({
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  BASE_PATH: z.string().default(""),
});

/**
 * Base AWS configuration schema. Aws SDK related libs inject
 * those automatically - in most cases you don't need to provide
 * them.
 */
export const awsConfigSchema = z.object({
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
});

export const appConfigEnvSchema = z.object({
  APP_CONFIG_STORE_PATH: z.string(),
  APP_CONFIG_KMS_KEY_ID: z.string().optional(),
});

export type BaseConfig = z.infer<typeof baseConfigSchema>;
export type AwsConfig = z.infer<typeof awsConfigSchema>;
export type AppConfigEnv = z.infer<typeof appConfigEnvSchema>;
