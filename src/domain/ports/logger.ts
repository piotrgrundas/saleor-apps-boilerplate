import type { ErrorReporter } from "./error-reporter";

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Construction options shared by all `Logger` adapters.
 */
export type LoggerOptions = {
  /**
   * Minimum level to emit. Messages below this level are dropped.
   */
  level: LogLevel;
  /**
   * Optional root tag prepended to all log lines. Useful for distinguishing
   * services in multi-app deployments. Per-call enrichment goes through
   * `withTag` / `withContext` at the request boundary.
   */
  name?: string;
  prettify?: boolean;
  /**
   * When provided, every `.error(...)` call also forwards to the reporter
   * (Sentry, etc.). Sub-loggers from `withTag` / `withContext` inherit it.
   */
  reporter?: ErrorReporter;
};

export type Logger = {
  trace(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  withTag(tag: string): Logger;
  withContext(context: Record<string, unknown>): Logger;
};
