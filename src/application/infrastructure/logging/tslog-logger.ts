import { Logger as TsLog, type ILogObj } from "tslog";

import type { Logger } from "@/application/domain/services/logger";
import type { LogLevel } from "./types";
import { redactSensitive } from "./utils";

// tslog levels: 0=silly, 1=trace, 2=debug, 3=info, 4=warn, 5=error, 6=fatal
const TSLOG_LEVEL_MAP: Record<LogLevel, number> = {
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
};

export class TsLogLogger implements Logger {
  private __logger: TsLog<ILogObj>;

  constructor(level: LogLevel = "info", name?: string) {
    this.__logger = new TsLog<ILogObj>({
      name,
      minLevel: TSLOG_LEVEL_MAP[level],
      type: "pretty",
      prettyLogTemplate: "[{{hh}}:{{mm}}:{{ss}}][{{logLevelName}}][{{name}}] ",
    });
  }

  private __formatMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    return meta ? redactSensitive(meta) : undefined;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.__logger.debug(message, this.__formatMeta(meta));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.__logger.info(message, this.__formatMeta(meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.__logger.warn(message, this.__formatMeta(meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.__logger.error(message, this.__formatMeta(meta));
  }

  withTag(newTag: string): Logger {
    const currentName = this.__logger.settings.name;
    const combinedName = currentName ? `${currentName}:${newTag}` : newTag;
    const logger = new TsLogLogger("info", combinedName);
    logger.__logger.settings.minLevel = this.__logger.settings.minLevel;
    return logger;
  }
}
