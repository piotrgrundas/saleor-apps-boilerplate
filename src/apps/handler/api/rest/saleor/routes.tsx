import { Hono } from "hono";

import { APP_CONFIG } from "@/apps/handler/config";
import { container } from "@/apps/handler/di/container";
import { fetchSaleorAppId } from "@/infrastructure/integrations/saleor/client/fetch-saleor-app-id";
import { ProductUpdatedDocument } from "@/infrastructure/integrations/saleor/graphql/ProductUpdateSubscription.generated";
import { saleorRegisterHeadersSchema } from "@/infrastructure/integrations/saleor/header/schema";
import { createSaleorInstall } from "@/infrastructure/integrations/saleor/install/saleor-install";
import { saleorRegisterPayloadSchema } from "@/infrastructure/integrations/saleor/install/schema";
import type { SaleorAppManifest } from "@/infrastructure/integrations/saleor/types";
import { BadGatewayException, ForbiddenException } from "@/lib/error/base";
import { zodValidatorMiddleware } from "@/lib/middleware/zod-validator-middleware";

import pkg from "@/../package.json";

const saleorInstall = createSaleorInstall({
  appConfigRepository: container.items.appConfigRepository,
  fetchAppId: fetchSaleorAppId,
  jwksRepository: container.items.jwksRepository,
  logger: container.items.logger,
});

const routes = new Hono();

/**
 * GET /api/saleor/manifest
 * Returns the Saleor App manifest.
 */
routes.get("/manifest", (context) => {
  const baseUrl = context.get("baseUrl");

  const manifest: SaleorAppManifest = {
    id: `${pkg.name.toLowerCase().replace(/\s+/g, "-")}.app`,
    version: pkg.version,
    name: pkg.name,
    about: pkg.description,
    permissions: ["MANAGE_PRODUCTS"],
    appUrl: `${baseUrl}/client/app`,
    tokenTargetUrl: `${baseUrl}/api/saleor/register`,
    author: pkg.author,
    brand: {
      logo: {
        default: `${baseUrl}/logo.png`,
      },
    },
    webhooks: [
      {
        name: "Product Updated",
        asyncEvents: ["PRODUCT_UPDATED"],
        query: ProductUpdatedDocument.toString(),
        targetUrl: `${baseUrl}/api/saleor/webhooks/product-updated`,
        isActive: true,
      },
    ],
  };

  const logger = context.get("logger");
  logger.info("dupa");
  logger.error("dupa2");

  return context.json(manifest);
});

/**
 * POST /api/saleor/register
 * Handles Saleor app installation.
 */
routes.post(
  "/register",
  zodValidatorMiddleware("header", saleorRegisterHeadersSchema),
  zodValidatorMiddleware("json", saleorRegisterPayloadSchema),
  async (context) => {
    const { auth_token: authToken } = context.req.valid("json");
    const { "saleor-domain": saleorDomain, "saleor-api-url": saleorApiUrl } =
      context.req.valid("header");
    const logger = context.get("logger");

    const result = await saleorInstall({
      saleorDomain,
      saleorApiUrl,
      authToken,
      allowedDomains: APP_CONFIG.ALLOWED_DOMAINS,
    });

    if (result.isErr()) {
      if (result.error[0]?.code === "SALEOR_INSTALL_DOMAIN_NOT_ALLOWED_ERROR") {
        throw new ForbiddenException(result.error);
      }

      throw new BadGatewayException(result.error);
    }

    return context.json({ success: true });
  },
);

export { routes as saleorRoutes };
