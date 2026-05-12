import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
import { createAwsSecretManagerAppConfigRepository } from "@/infrastructure/app-config/aws/aws-secret-manager-app-config-repository";

export const createAppConfig = (): AppConfigRepository =>
  createAwsSecretManagerAppConfigRepository({
    region: process.env.AWS_REGION ?? "",
    secretPath: process.env.SECRET_MANAGER_APP_CONFIG_PATH ?? "",
    endpoint: process.env.AWS_ENDPOINT_URL,
  });
