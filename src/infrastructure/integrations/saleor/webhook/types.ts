import type { Context } from "hono";
import type { BlankEnv } from "hono/types";

import type { SaleorWebhookHeaders } from "./schema";

export type WebhookData<E extends { event: unknown }> = Exclude<
  NonNullable<E["event"]>,
  Record<PropertyKey, never>
>;

export type SaleorWebhookHandlerContext<
  WebhookEvent extends { event: unknown } = { event: unknown },
  Headers = SaleorWebhookHeaders,
> = Context<
  BlankEnv,
  string,
  {
    in: {
      header: Headers;
      json: WebhookData<WebhookEvent>;
    };
    out: {
      header: Headers;
      json: WebhookData<WebhookEvent>;
    };
  }
>;
