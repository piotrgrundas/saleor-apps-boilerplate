import { createContainer } from "iti";

import { InstallAppUseCase } from "@/application/use-cases/install-app-use-case";
import { ValidateWebhookUseCase } from "@/application/use-cases/validate-webhook-use-case";
import { createAppConfig } from "./factories/app-config";
import { createJwksRepository, createJwksService } from "./factories/jwks";
import { createJwtService } from "./factories/jwt";
import { createLogger } from "./factories/logging";
import { createStoreService } from "./factories/store-service";

export const container = createContainer()
  .add({
    logger: () => createLogger(),
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
  }))
  .add((ctx) => ({
    installApp: () =>
      new InstallAppUseCase(
        ctx.appConfigRepository,
        ctx.storeService,
        ctx.jwksRepository,
        ctx.logger,
      ),
  }))
  .add((ctx) => ({
    validateWebhook: () => new ValidateWebhookUseCase(ctx.storeService),
  }));

export type AppContainer = typeof container;
