import { createConsola } from "consola";

import type { Logger } from "@/application/domain/services/logger";
import { LOG_LEVEL_MAP, type LogLevel } from "./types";
import { redactSensitive } from "./utils";

export class ConsolaLogger implements Logger {
  private __consola: ReturnType<typeof createConsola>;
  private __tag?: string;

  constructor(level: LogLevel = "info", tag?: string) {
    this.__consola = createConsola({ level: LOG_LEVEL_MAP[level] });
    this.__tag = tag;
  }

  private get __instance() {
    return this.__tag ? this.__consola.withTag(this.__tag) : this.__consola;
  }

  private __formatMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    return meta ? redactSensitive(meta) : undefined;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.__instance.debug(message, this.__formatMeta(meta));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.__instance.info(message, this.__formatMeta(meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.__instance.warn(message, this.__formatMeta(meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.__instance.error(message, this.__formatMeta(meta));
  }

  withTag(newTag: string): Logger {
    const combinedTag = this.__tag ? `${this.__tag}:${newTag}` : newTag;
    const logger = new ConsolaLogger("info", combinedTag);
    logger.__consola = this.__consola;
    return logger;
  }
}
