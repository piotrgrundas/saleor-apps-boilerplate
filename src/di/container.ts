import { createContainer } from "iti";

import { createAppConfig } from "./factories/app-config";
import { createJwksRepository, createJwksService } from "./factories/jwks";
import { createJwtService } from "./factories/jwt";
import { createLogger } from "./factories/logging";
import { createStoreService } from "./factories/store-service";

import type { LogLevel } from "@/infrastructure/logging/types";

export type GlobalContainerConfig = {
  LOG_LEVEL: LogLevel;
};

export const createGlobalContainer = (config: GlobalContainerConfig) =>
  createContainer()
    .add({
      logger: () => createLogger({ level: config.LOG_LEVEL }),
    })
    .add({
      jwksRepository: () => createJwksRepository(),
    })
    .add((ctx) => ({
      jwksService: () => createJwksService(ctx.jwksRepository),
    }))
    .add({
      jwtService: () => createJwtService(),
    })
    .add({
      appConfigRepository: () => createAppConfig(),
    })
    .add((ctx) => ({
      storeService: () => createStoreService(ctx.jwksService),
    }));

export type GlobalContainer = ReturnType<typeof createGlobalContainer>;
