import { createContainer } from "iti";

import type { LogLevel } from "@/domain/ports/logger";
import { createJoseAuthService } from "@/infrastructure/jose/auth/jose-auth-service";

import { createAppConfig } from "./factories/app-config";
import { createErrorReporter } from "./factories/error-reporter";
import { createJwks } from "./factories/jwks";
import { createLogger } from "./factories/logging";

export type GlobalContainerConfig = {
  LOG_LEVEL: LogLevel;
  IS_PRODUCTION: boolean;
  SERVICE?: string;
  APP_CONFIG_STORE_PATH: string;
  APP_CONFIG_KMS_KEY_ID?: string;
  SENTRY_DSN?: string;
  ENVIRONMENT?: string;
  RELEASE?: string;
};

export const createGlobalContainer = (config: GlobalContainerConfig) =>
  createContainer()
    .add({
      errorReporter: () =>
        createErrorReporter({
          sentryDsn: config.SENTRY_DSN,
          environment: config.ENVIRONMENT,
          release: config.RELEASE,
        }),
      jwksRepository: () => createJwks(),
    })
    .add((ctx) => ({
      logger: () =>
        createLogger({
          prettify: !config.IS_PRODUCTION,
          level: config.LOG_LEVEL,
          name: config.SERVICE,
          reporter: ctx.errorReporter,
        }),
    }))
    .add((ctx) => ({
      joseAuthService: () => createJoseAuthService({ jwksRepository: ctx.jwksRepository }),
    }))
    .add({
      appConfigRepository: () =>
        createAppConfig({
          configPath: config.APP_CONFIG_STORE_PATH,
          kmsKeyId: config.APP_CONFIG_KMS_KEY_ID,
        }),
    });

export type GlobalContainer = ReturnType<typeof createGlobalContainer>;
