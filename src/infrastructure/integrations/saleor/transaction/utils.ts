import type { TransactionAction } from "@/infrastructure/integrations/saleor/transaction/const";
import { TRANSACTION_EVENT_TYPES } from "@/infrastructure/integrations/saleor/transaction/const";

export function getSuccessEventType(action: TransactionAction): string {
  return TRANSACTION_EVENT_TYPES[`${action}_SUCCESS` as keyof typeof TRANSACTION_EVENT_TYPES];
}

export function getFailureEventType(action: TransactionAction): string {
  return TRANSACTION_EVENT_TYPES[`${action}_FAILURE` as keyof typeof TRANSACTION_EVENT_TYPES];
}

export function getRequestEventType(action: TransactionAction): string {
  return TRANSACTION_EVENT_TYPES[`${action}_REQUEST` as keyof typeof TRANSACTION_EVENT_TYPES];
}
