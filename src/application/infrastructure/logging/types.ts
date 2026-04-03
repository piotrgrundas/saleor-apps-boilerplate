export type LogLevel = "debug" | "info" | "warn" | "error";

export const LOG_LEVEL_MAP: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 3,
  debug: 4,
};
