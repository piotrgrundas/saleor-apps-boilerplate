import { Writable } from "node:stream";
import { inspect } from "node:util";
import pino, { type Logger as PinoLogger } from "pino";

import type { Logger, LoggerOptions } from "@/domain/ports/logger";

import { redactSensitive } from "../utils";

const LEVEL_COLORS: Record<string, (s: string) => string> = {
  trace: (s) => `\x1b[90m${s}\x1b[0m`,
  debug: (s) => `\x1b[32m${s}\x1b[0m`,
  info: (s) => `\x1b[34m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  error: (s) => `\x1b[31m${s}\x1b[0m`,
};

const TAG_COLOR = (s: string) => `\x1b[35m${s}\x1b[0m`;
const TIME_COLOR = (s: string) => `\x1b[36m${s}\x1b[0m`;

const HIDDEN_PRETTY_KEYS = new Set([]);

const prettyStream = () =>
  new Writable({
    write(chunk, _encoding, callback) {
      try {
        const { level, time, message, tag, name, ...rest } = JSON.parse(chunk.toString());
        const t = TIME_COLOR(`[${String(time).slice(11, 19)}]`);
        const label = tag ?? name;
        const tagStr = label ? TAG_COLOR(`[${label}]`) : "";
        const lvl = (LEVEL_COLORS[level] ?? ((s: string) => s))(level.toUpperCase());

        process.stdout.write(`${t}${tagStr} ${lvl} ${message}\n`);

        const visible = Object.fromEntries(
          Object.entries(rest).filter(([k]) => !HIDDEN_PRETTY_KEYS.has(k)),
        );
        if (Object.keys(visible).length) {
          process.stdout.write(
            inspect(visible, { colors: true, depth: null, compact: false }) + "\n",
          );
        }
      } catch {
        process.stdout.write(chunk);
      }

      callback();
    },
  });

const toLogger = (logger: PinoLogger, reporter?: LoggerOptions["reporter"]): Logger => ({
  trace: (msg, meta) => logger.trace(meta ? redactSensitive(meta) : {}, msg),
  debug: (msg, meta) => logger.debug(meta ? redactSensitive(meta) : {}, msg),
  info: (msg, meta) => logger.info(meta ? redactSensitive(meta) : {}, msg),
  warn: (msg, meta) => logger.warn(meta ? redactSensitive(meta) : {}, msg),
  error: (msg, meta) => {
    logger.error(meta ? redactSensitive(meta) : {}, msg);
    if (reporter) {
      const err = meta?.error instanceof Error ? meta.error : new Error(msg);
      void reporter.capture(err, meta);
    }
  },
  withTag: (tag) => toLogger(logger.child({ tag }), reporter),
  withContext: (extra) => toLogger(logger.child(extra), reporter),
});

export const createPinoLogger = ({ level, name, prettify, reporter }: LoggerOptions): Logger => {
  const opts = {
    name,
    level,
    base: { pid: undefined, hostname: undefined },
    messageKey: "message",
    formatters: { level: (label: string) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  const base = prettify ? pino(opts, prettyStream()) : pino(opts, pino.destination({ sync: true }));

  return toLogger(base, reporter);
};
