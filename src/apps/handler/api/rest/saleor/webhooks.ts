import { Hono } from "hono";

import { createStoreWebhookValidationMiddleware } from "@/application/infrastructure/saleor/middleware/store-webhook-validation-middleware";
import { container } from "@/di/container";

const { validateWebhook } = container.items;

const webhooks = new Hono();

const webhookValidation = createStoreWebhookValidationMiddleware(validateWebhook);

/**
 * POST /api/saleor/webhooks/product-updated
 * Handles the PRODUCT_UPDATED webhook event.
 */
webhooks.post("/product-updated", webhookValidation, async (c) => {
  const body = await c.req.json();
  const saleorDomain = c.get("saleorDomain");
  const saleorEvent = c.get("saleorEvent");
  const logger = c.get("logger");

  logger.info("Product updated webhook received", {
    saleorDomain,
    saleorEvent,
    productId: body?.product?.id,
  });

  // TODO: Add your product update handling logic here

  return c.json({ success: true });
});

export { webhooks as saleorWebhooks };
