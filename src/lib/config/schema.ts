import { z } from "zod";

import { LOG_LEVELS } from "@/domain/ports/logger";

import pkg from "@/../package.json";

export const ENVIRONMENTS = ["local", "development", "staging", "production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const baseConfigSchema = z
  .object({
    LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
    BASE_PATH: z.string().default(""),
    ENVIRONMENT: z.enum(ENVIRONMENTS).default("local"),
    SENTRY_DSN: z.url().optional(),
  })
  .transform((data) => {
    const NAME = pkg.name;
    const VERSION = pkg.version;
    const RELEASE = `${NAME}@${VERSION}`.toLowerCase().replaceAll("-", "_");

    return {
      AUTHOR: pkg.author,
      DESCRIPTION: pkg.description,
      IS_DEVELOPMENT: process.env.NODE_ENV === "development",
      IS_PRODUCTION: process.env.NODE_ENV === "production",
      IS_TEST: process.env.NODE_ENV === "test",
      NAME,
      RELEASE,
      VERSION,
      ...data,
    };
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
