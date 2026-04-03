import { Hono } from "hono";

import { saleorDomainHeaderSchema } from "@/application/infrastructure/saleor/header/schema";
import { appSettingsSchema, dashboardAppConfigSchema } from "@/apps/dashboard/config/schema";
import { container } from "@/di/container";
import { BadRequestError, NotFoundError } from "@/lib/error/base";
import { zodValidatorMiddleware } from "@/lib/middleware/zod-validator-middleware";

const { appConfigRepository } = container.items;

export const configurationRoutes = new Hono()
  .get("/", zodValidatorMiddleware("header", saleorDomainHeaderSchema), async (c) => {
    const { "saleor-domain": saleorDomain } = c.req.valid("header");

    const result = await appConfigRepository.get(saleorDomain);

    if (result.isErr()) {
      throw new BadRequestError(result.error.message);
    }

    if (!result.value) {
      throw new NotFoundError(`No configuration found for domain: ${saleorDomain}`);
    }

    const config = dashboardAppConfigSchema.parse(result.value);

    return c.json({ data: config.settings });
  })
  .post(
    "/",
    zodValidatorMiddleware("header", saleorDomainHeaderSchema),
    zodValidatorMiddleware("json", appSettingsSchema),
    async (c) => {
      const { "saleor-domain": saleorDomain } = c.req.valid("header");
      const settings = c.req.valid("json");

      const getResult = await appConfigRepository.get(saleorDomain);

      if (getResult.isErr()) {
        throw new BadRequestError(getResult.error.message);
      }

      if (!getResult.value) {
        throw new NotFoundError(`No configuration found for domain: ${saleorDomain}`);
      }

      const updated = { ...getResult.value, settings };
      const setResult = await appConfigRepository.set(saleorDomain, updated);

      if (setResult.isErr()) {
        throw new BadRequestError(setResult.error.message);
      }

      return c.json({ success: true });
    },
  );

export type ConfigurationRoutes = typeof configurationRoutes;
