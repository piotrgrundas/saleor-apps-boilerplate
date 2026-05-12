import { installAppUseCase } from "@/application/install-app-use-case";
import { validateWebhookUseCase } from "@/application/validate-webhook-use-case";
import { createGlobalContainer } from "@/di/container";
import { APP_CONFIG } from "../config";

export const container = createGlobalContainer(APP_CONFIG)
  .add((ctx) => ({
    installAppUseCase: () =>
      installAppUseCase({
        appConfigRepository: ctx.appConfigRepository,
        storeService: ctx.storeService,
        jwksRepository: ctx.jwksRepository,
        logger: ctx.logger,
      }),
  }))
  .add((ctx) => ({
    validateWebhookUseCase: () => validateWebhookUseCase({ storeService: ctx.storeService }),
  }));

export type HandlerContainer = typeof container;
