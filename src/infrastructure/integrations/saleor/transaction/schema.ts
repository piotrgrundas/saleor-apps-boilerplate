import { z } from "zod";

export const transactionAmountSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
});

export type TransactionAmount = z.infer<typeof transactionAmountSchema>;
