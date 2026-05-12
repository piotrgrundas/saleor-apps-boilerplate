import { z } from "zod";

export const saleorWebhookHeadersSchema = z.object({
  "saleor-domain": z.string().min(1, "Missing saleor-domain header"),
  "saleor-api-url": z.url("Invalid saleor-api-url header"),
  "saleor-event": z.string().min(1, "Missing saleor-event header"),
  "saleor-signature": z.string().min(1, "Missing saleor-signature header"),
});

export type SaleorWebhookHeaders = z.infer<typeof saleorWebhookHeadersSchema>;

export const webhookDataSchema = z.object({ event: z.unknown() }).passthrough();
