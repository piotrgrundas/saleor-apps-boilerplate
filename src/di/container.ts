import { createContainer } from "iti";

import type { LogLevel } from "@/domain/ports/logger";
import { createJoseAuthService } from "@/infrastructure/jose/auth/jose-auth-service";

import { createAppConfig } from "./factories/app-config";
import { createJwks } from "./factories/jwks";
import { createLogger } from "./factories/logging";

export type GlobalContainerConfig = {
  LOG_LEVEL: LogLevel;
  SERVICE?: string;
  APP_CONFIG_STORE_PATH: string;
  APP_CONFIG_KMS_KEY_ID?: string;
};

export const createGlobalContainer = (config: GlobalContainerConfig) =>
  createContainer()
    .add({
      logger: () => createLogger({ level: config.LOG_LEVEL, name: config.SERVICE }),
    })
    .add({
      jwksRepository: () => createJwks(),
    })
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
