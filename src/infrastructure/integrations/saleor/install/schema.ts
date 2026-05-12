import { z } from "zod";

export const saleorRegisterPayloadSchema = z.object({
  auth_token: z.string(),
});

export type SaleorRegisterPayload = z.infer<typeof saleorRegisterPayloadSchema>;
