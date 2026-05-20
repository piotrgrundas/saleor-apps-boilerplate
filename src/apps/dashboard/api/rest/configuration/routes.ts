import { Hono } from "hono";

import { container } from "@/dashboard/di/container";
import {
  appSettingsSchema,
  tenantAppConfigSchema,
} from "@/infrastructure/integrations/saleor/app-config/settings";
import { saleorDomainHeaderSchema } from "@/infrastructure/integrations/saleor/header/schema";
import { BadRequestError, NotFoundError } from "@/lib/error/base";
import { zodValidatorMiddleware } from "@/lib/middleware/zod-validator-middleware";

const { appConfigRepository: appConfigProvider } = container.items;

export const configurationRoutes = new Hono()
  .get("/", zodValidatorMiddleware("header", saleorDomainHeaderSchema), async (context) => {
    const { "saleor-domain": saleorDomain } = context.req.valid("header");
    const ctx = { logger: context.get("logger") };
    const appConfigRepository = appConfigProvider(ctx);

    const result = await appConfigRepository.get(saleorDomain);

    if (result.isErr()) {
      throw new BadRequestError(result.error[0]?.message ?? "Config error");
    }

    if (!result.value) {
      throw new NotFoundError(`No configuration found for domain: ${saleorDomain}`);
    }

    const config = tenantAppConfigSchema.parse(result.value);

    return context.json({ data: config.settings });
  })
  .post(
    "/",
    zodValidatorMiddleware("header", saleorDomainHeaderSchema),
    zodValidatorMiddleware("json", appSettingsSchema),
    async (context) => {
      const { "saleor-domain": saleorDomain } = context.req.valid("header");
      const settings = context.req.valid("json");
      const ctx = { logger: context.get("logger") };
      const appConfigRepository = appConfigProvider(ctx);

      const getResult = await appConfigRepository.get(saleorDomain);

      if (getResult.isErr()) {
        throw new BadRequestError(getResult.error[0]?.message ?? "Config error");
      }

      if (!getResult.value) {
        throw new NotFoundError(`No configuration found for domain: ${saleorDomain}`);
      }

      const updated = { ...getResult.value, settings };
      const setResult = await appConfigRepository.set({ saleorDomain, config: updated });

      if (setResult.isErr()) {
        throw new BadRequestError(setResult.error[0]?.message ?? "Config error");
      }

      return context.json({ success: true });
    },
  );

export type ConfigurationRoutes = typeof configurationRoutes;
