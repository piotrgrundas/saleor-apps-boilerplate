import { Hono } from "hono";

import { createStoreWebhookValidationMiddleware } from "@/infrastructure/saleor/middleware/store-webhook-validation-middleware";
import { container } from "@/apps/handler/di/container";

const { validateWebhookUseCase: validateWebhook } = container.items;

const webhooks = new Hono();

const webhookValidation = createStoreWebhookValidationMiddleware(validateWebhook);

/**
 * POST /api/saleor/webhooks/product-updated
 * Handles the PRODUCT_UPDATED webhook event.
 */
webhooks.post("/product-updated", webhookValidation, async (context) => {
  const body = await context.req.json();
  const saleorDomain = context.get("saleorDomain");
  const saleorEvent = context.get("saleorEvent");
  const logger = context.get("logger");

  logger.info("Product updated webhook received", {
    saleorDomain,
    saleorEvent,
    productId: body?.product?.id,
  });

  // TODO: Add your product update handling logic here

  return context.json({ success: true });
});

export { webhooks as saleorWebhooks };
