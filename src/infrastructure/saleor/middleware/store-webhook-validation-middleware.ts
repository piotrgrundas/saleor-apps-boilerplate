import { createMiddleware } from "hono/factory";

import type { ValidateWebhookUseCase } from "@/application/validate-webhook-use-case";
import { BadRequestError, UnauthorizedError } from "@/lib/error/base";

/**
 * Middleware that validates store webhook requests:
 * 1. Passes request headers and body to the validateWebhookUseCase
 * 2. Maps domain errors to HTTP errors (400 for invalid headers, 401 for bad signature)
 * 3. Sets validated webhook data on the Hono context
 */
export function createStoreWebhookValidationMiddleware(validateWebhook: ValidateWebhookUseCase) {
  return createMiddleware(async (context, next) => {
    const body = await context.req.text();

    const result = await validateWebhook({
      headers: Object.fromEntries(context.req.raw.headers.entries()),
      body,
    });

    if (result.isErr()) {
      const first = result.error[0];
      if (first?.code === "VALIDATE_WEBHOOK_HEADERS_ERROR") {
        throw new BadRequestError(first.message);
      }
      throw new UnauthorizedError(first?.message ?? "Invalid webhook");
    }

    context.set("saleorDomain", result.value.domain);
    context.set("saleorApiUrl", result.value.apiUrl);
    context.set("saleorEvent", result.value.event);

    await next();
  });
}
