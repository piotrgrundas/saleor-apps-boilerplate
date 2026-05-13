export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

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
