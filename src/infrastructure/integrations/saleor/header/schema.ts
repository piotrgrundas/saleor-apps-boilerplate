import { z } from "zod";

export const saleorDomainHeaderSchema = z.object({
  "saleor-domain": z.string().min(1, "Missing saleor-domain header"),
});

export const saleorApiUrlHeaderSchema = z.object({
  "saleor-api-url": z.string().url("Invalid saleor-api-url header"),
});

export const saleorRegisterHeadersSchema = saleorDomainHeaderSchema.merge(saleorApiUrlHeaderSchema);

export type SaleorRegisterHeaders = z.infer<typeof saleorRegisterHeadersSchema>;
