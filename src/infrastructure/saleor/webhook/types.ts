import type { Context } from "hono";

export interface WebhookContext {
  saleorDomain: string;
  saleorApiUrl: string;
  saleorEvent: string;
}

export type WebhookHandler = (
  c: Context,
  payload: unknown,
  webhookContext: WebhookContext,
) => Promise<Response>;
