import { createMiddleware } from "hono/factory";

import type { ValidateWebhookErrorCode } from "@/application/domain/objects/error";
import type { UseCase } from "@/application/domain/use-case";
import type {
  ValidateWebhookInput,
  ValidateWebhookOutput,
} from "@/application/use-cases/validate-webhook-use-case";
import { BadRequestError, UnauthorizedError } from "@/lib/error/base";

/**
 * Middleware that validates store webhook requests:
 * 1. Passes request headers and body to the ValidateWebhookUseCase
 * 2. Maps domain errors to HTTP errors (400 for invalid headers, 401 for bad signature)
 * 3. Sets validated webhook data on the Hono context
 */
export function createStoreWebhookValidationMiddleware(
  validateWebhook: UseCase<ValidateWebhookInput, ValidateWebhookOutput, ValidateWebhookErrorCode>,
) {
  return createMiddleware(async (context, next) => {
    const body = await context.req.text();

    const result = await validateWebhook.execute({
      headers: Object.fromEntries(context.req.raw.headers.entries()),
      body,
    });

    if (result.isErr()) {
      if (result.error.code === "VALIDATE_WEBHOOK_HEADERS_ERROR") {
        throw new BadRequestError(result.error.message);
      }
      throw new UnauthorizedError(result.error.message);
    }

    context.set("saleorDomain", result.value.domain);
    context.set("saleorApiUrl", result.value.apiUrl);
    context.set("saleorEvent", result.value.event);

    await next();
  });
}
