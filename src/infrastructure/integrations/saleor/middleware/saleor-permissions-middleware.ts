import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import type { JoseAuthServiceProvider } from "@/domain/ports/jose-auth-service";
import { PermissionEnum } from "@/infrastructure/integrations/saleor/graphql/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/error/base";

const TOKEN_HEADER = "authorization-bearer";
const API_URL_HEADER = "saleor-api-url";

export type SaleorPermission = PermissionEnum;

/**
 * Validates the caller has all required Saleor app permissions.
 *
 *   1. Reads `authorization-bearer` (Saleor app token) and `saleor-api-url`
 *      (issuer) headers — both required.
 *   2. Verifies the JWT signature against the issuer's JWKS.
 *   3. Asserts every required permission is present in the JWT's
 *      `permissions` claim, else throws 403.
 *
 * Usage (Hono):
 *
 *   routes.post(
 *     "/admin",
 *     saleorPermissionsMiddleware({
 *       joseAuthService: container.items.joseAuthService,
 *       required: ["MANAGE_PRODUCTS"],
 *     }),
 *     handler,
 *   );
 */
export function saleorPermissionsMiddleware({
  joseAuthService: joseAuthServiceProvider,
  required,
}: {
  joseAuthService: JoseAuthServiceProvider;
  required: SaleorPermission[];
}): MiddlewareHandler {
  return createMiddleware(async (context, next) => {
    const token = context.req.header(TOKEN_HEADER);
    const apiUrl = context.req.header(API_URL_HEADER);

    if (!token) throw new UnauthorizedError(`Missing ${TOKEN_HEADER} header`);

    if (!apiUrl) throw new UnauthorizedError(`Missing ${API_URL_HEADER} header`);

    const ctx = { logger: context.get("logger") };
    const joseAuthService = joseAuthServiceProvider(ctx);
    const verified = await joseAuthService.verifyJWT({ token, issuer: apiUrl });

    if (verified.isErr()) {
      throw new UnauthorizedError(verified.error[0]?.message ?? "Invalid Saleor token");
    }

    const permissions = new Set((verified.value.permissions as string[]) ?? []);
    const missing = required.filter((p) => !permissions.has(p));

    if (missing.length > 0) {
      throw new ForbiddenError(`Missing Saleor permissions: ${missing.join(", ")}`);
    }

    await next();
  });
}
