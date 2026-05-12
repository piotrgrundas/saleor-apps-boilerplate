import { Hono } from "hono";

import { container } from "@/apps/handler/di/container";
import { saleorWebhookValidationMiddleware } from "@/infrastructure/integrations/saleor/middleware/saleor-webhook-validation-middleware";
import type { SaleorWebhookHandlerContext } from "@/infrastructure/integrations/saleor/webhook/types";

const webhooks = new Hono();

webhooks.use("*", saleorWebhookValidationMiddleware({ joseAuthService: container.items.joseAuthService }));

/**
 * POST /api/saleor/webhooks/product-updated
 * Handles the PRODUCT_UPDATED webhook event.
 */
webhooks.post("/product-updated", async (context: SaleorWebhookHandlerContext) => {
  const { "saleor-domain": saleorDomain, "saleor-event": saleorEvent } =
    context.req.valid("header");
  const logger = context.get("logger");

  logger.info("Product updated webhook received", { saleorDomain, saleorEvent });

  // TODO: Add your product update handling logic here

  return context.json({ success: true });
});

export { webhooks as saleorWebhooks };
