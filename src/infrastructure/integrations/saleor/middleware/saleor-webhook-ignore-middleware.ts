import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import { IssuingPrincipalFragment } from "@/infrastructure/integrations/saleor/graphql/fragments/IssuingPrincipalFragment.generated";
import type { NonEmptyArray, RequireAtLeastOne } from "@/lib/utils/types";

/**
 * Short-circuits Saleor webhooks whose `event.issuingPrincipal` matches one of
 * the configured app identifiers or user emails. Useful to skip echoes from
 * your own app or specific automation accounts.
 *
 * At least one of `appIdentifiers` / `userEmails` must be a non-empty array;
 * passing neither throws at middleware construction.
 *
 * If a webhook arrives without `issuingPrincipal` the request is allowed
 * through and an error is logged (the producer should have populated it).
 *
 * Usage (Hono):
 *
 *   webhooks.post(
 *     "/product-updated",
 *     saleorWebhookIgnoreMiddleware({ appIdentifiers: [APP_ID] }),
 *     handler,
 *   );
 */
export function saleorWebhookIgnoreMiddleware(
  options: RequireAtLeastOne<{
    appIdentifiers: NonEmptyArray<string>;
    userEmails: NonEmptyArray<string>;
  }>,
): MiddlewareHandler {
  const appIdentifiers: readonly string[] = options.appIdentifiers ?? [];
  const userEmails: readonly string[] = options.userEmails ?? [];

  if (appIdentifiers.length === 0 && userEmails.length === 0) {
    throw new Error(
      "saleorWebhookIgnoreMiddleware: provide a non-empty `appIdentifiers` or `userEmails`",
    );
  }

  return createMiddleware(async (context, next) => {
    const logger = context.get("logger");
    const body = (context.req.valid("json" as never) ?? (await context.req.json())) as
      | {
          event?: { issuingPrincipal?: IssuingPrincipalFragment | null };
        }
      | undefined;

    const principal = body?.event?.issuingPrincipal;

    if (!principal) {
      logger.error("Saleor webhook missing event.issuingPrincipal", {
        path: context.req.path,
      });
      await next();
      return;
    }

    const matchedApp =
      principal.__typename === "App" &&
      !!principal.identifier &&
      appIdentifiers.includes(principal.identifier);

    const matchedUser =
      principal.__typename === "User" && !!principal.email && userEmails.includes(principal.email);

    if (matchedApp || matchedUser) {
      logger.debug("Ignoring Saleor webhook by issuingPrincipal", {
        path: context.req.path,
        principal,
      });
      return context.json({ ignored: true });
    }

    await next();
  });
}
