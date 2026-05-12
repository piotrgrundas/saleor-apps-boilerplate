import { z } from "zod";

export const baseConfigSchema = z.object({
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error"])
    .default("info"),
  BASE_PATH: z.string().default(""),
});

export const awsConfigSchema = z.object({
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ENDPOINT_URL: z.url().optional(),
});

export type BaseConfig = z.infer<typeof baseConfigSchema>;
export type AwsConfig = z.infer<typeof awsConfigSchema>;
