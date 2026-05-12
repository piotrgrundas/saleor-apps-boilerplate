import type { Logger } from "./ports/logger";

/**
 * Per-call operation context carrying request-scoped data.
 * Threaded through every fallible operation (ports, use-cases, procedures).
 *
 * Today carries the logger. Future fields slot in here without changing
 * every method signature:
 *   - signal?: AbortSignal     — caller-initiated cancellation
 *   - deadline?: Date          — timeout cascade
 *   - tenantId?: string        — multi-tenant scoping
 *   - traceparent?: string     — W3C trace context
 */
export type Context = {
  logger: Logger;
};
