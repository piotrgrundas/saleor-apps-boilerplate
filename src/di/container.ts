import { createContainer } from "iti";

import type { LogLevel } from "@/domain/ports/logger";
import { createJoseAuthService } from "@/infrastructure/jose/auth/jose-auth-service";
import { createJwksRepositoryFactory } from "@/infrastructure/jose/jwks/memory/jwks-memory-repository-factory";

import { createAppConfig } from "./factories/app-config";
import { createLogger } from "./factories/logging";

export type GlobalContainerConfig = {
  LOG_LEVEL: LogLevel;
};

export const createGlobalContainer = (config: GlobalContainerConfig) =>
  createContainer()
    .add({
      logger: () => createLogger({ level: config.LOG_LEVEL }),
    })
    .add({
      jwksRepository: () => createJwksRepositoryFactory(),
    })
    .add((ctx) => ({
      joseAuthService: () => createJoseAuthService({ jwksRepository: ctx.jwksRepository }),
    }))
    .add({
      appConfigRepository: () => createAppConfig(),
    });

export type GlobalContainer = ReturnType<typeof createGlobalContainer>;
