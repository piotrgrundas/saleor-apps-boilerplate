import type { MiddlewareHandler } from "hono";
import { every } from "hono/combine";
import { createMiddleware } from "hono/factory";

import type { JoseAuthService } from "@/domain/ports/jose-auth-service";
import {
  saleorWebhookHeadersSchema,
  webhookDataSchema,
} from "@/infrastructure/integrations/saleor/webhook/schema";
import { UnauthorizedError } from "@/lib/error/base";
import { zodValidatorMiddleware } from "@/lib/middleware/zod-validator-middleware";

type Opts = {
  joseAuthService: JoseAuthService;
};

/**
 * Validates Saleor webhook requests:
 * 1. Zod validates required Saleor headers
 * 2. Verifies JWS signature against issuer's JWKS (raw body bytes)
 * 3. Zod validates body envelope shape
 */
export function saleorWebhookValidationMiddleware({ joseAuthService }: Opts): MiddlewareHandler {
  const verify = createMiddleware(async (context, next) => {
    const headers = context.req.valid("header" as never) as {
      "saleor-signature": string;
      "saleor-api-url": string;
    };

    const payload = await context.req.text();
    const ctx = { logger: context.get("logger") };

    const result = await joseAuthService.verifyJWSDetached(
      {
        jws: headers["saleor-signature"],
        payload,
        issuer: headers["saleor-api-url"],
      },
      ctx,
    );

    if (result.isErr()) {
      throw new UnauthorizedError(result.error[0]?.message ?? "Invalid webhook signature");
    }

    await next();
  });

  return every(
    zodValidatorMiddleware("header", saleorWebhookHeadersSchema),
    verify,
    zodValidatorMiddleware("json", webhookDataSchema),
  );
}
