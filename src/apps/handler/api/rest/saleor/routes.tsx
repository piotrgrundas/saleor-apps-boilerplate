import { Hono } from "hono";
import { z } from "zod";

import pkg from "@/../package.json";
import { saleorRegisterHeadersSchema } from "@/application/infrastructure/saleor/header/schema";
import type { SaleorAppManifest } from "@/application/infrastructure/saleor/types";
import { APP_CONFIG } from "@/apps/handler/config";
import { ProductUpdatedDocument } from "@/apps/handler/graphql/saleor/subscriptions/ProductUpdateSubscription.generated";
import { container } from "@/di/container";
import { BadGatewayException, ForbiddenException } from "@/lib/error/base";
import { zodValidatorMiddleware } from "@/lib/middleware/zod-validator-middleware";

const productUpdatedSubscription = ProductUpdatedDocument.toString();

const routes = new Hono();

/**
 * GET /api/saleor/manifest
 * Returns the Saleor App manifest.
 */
routes.get("/manifest", (context) => {
  const origin = context.get("origin");

  const manifest: SaleorAppManifest = {
    id: `${pkg.name.toLowerCase().replace(/\s+/g, "-")}.app`,
    version: pkg.version,
    name: pkg.name,
    about: pkg.description,
    permissions: ["MANAGE_PRODUCTS"],
    appUrl: `${origin}/client/app`,
    tokenTargetUrl: `${origin}/api/saleor/register`,
    author: pkg.author,
    brand: {
      logo: {
        default: `${origin}/logo.png`,
      },
    },
    webhooks: [
      {
        name: "Product Updated",
        asyncEvents: ["PRODUCT_UPDATED"],
        query: productUpdatedSubscription,
        targetUrl: `${origin}/api/saleor/webhooks/product-updated`,
        isActive: true,
      },
    ],
  };

  return context.json(manifest);
});

/**
 * POST /api/saleor/register
 * Handles Saleor app installation.
 */
routes.post(
  "/register",
  zodValidatorMiddleware("header", saleorRegisterHeadersSchema),
  zodValidatorMiddleware(
    "json",
    z.object({
      auth_token: z.string(),
    }),
  ),
  async (context) => {
    const { auth_token: authToken } = context.req.valid("json");
    const installApp = container.get("installApp");

    const { "saleor-domain": saleorDomain, "saleor-api-url": saleorApiUrl } =
      context.req.valid("header");

    const result = await installApp.execute({
      saleorDomain,
      saleorApiUrl,
      authToken,
      allowedDomains: APP_CONFIG.ALLOWED_DOMAINS,
    });

    if (result.isErr()) {
      if (result.error.code === "INSTALL_APP_DOMAIN_NOT_ALLOWED_ERROR") {
        throw new ForbiddenException(result.error);
      }

      throw new BadGatewayException(result.error);
    }

    return context.json({ success: true });
  },
);

export { routes as saleorRoutes };
