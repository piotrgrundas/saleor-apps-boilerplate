import { inspect } from "node:util";
import { Logger as TsLog, type ILogObj } from "tslog";

import type { Logger, LoggerOptions, LogLevel } from "@/domain/ports/logger";

import { redactSensitive } from "../utils";

/**
 * tslog levels:
 *   0=silly
 *   1=trace
 *   2=debug
 *   3=info
 *   4=warn
 *   5=error
 *   6=fatal
 */
const TSLOG_LEVEL: Record<LogLevel, number> = {
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
};

// https://tslog.js.org/#/?id=pretty-templates-and-styles-color-settings-1
const STYLES = {
  logLevelName: {
    "*": ["bold", "black", "bgWhiteBright", "dim"],
    SILLY: ["bold", "white"],
    TRACE: ["bold", "whiteBright"],
    DEBUG: ["bold", "green"],
    INFO: ["bold", "blue"],
    WARN: ["bold", "yellow"],
    ERROR: ["bold", "red"],
    FATAL: ["bold", "redBright"],
  },
  name: ["magenta"],
  hh: ["cyan"],
  MM: ["cyan"],
  ss: ["cyan"],
  nameWithDelimiterPrefix: ["white", "bold"],
  nameWithDelimiterSuffix: ["white", "bold"],
  filePathWithLine: "white",
  fileNameWithLine: "white",
  fileName: ["yellow"],
  errorName: ["bold", "bgRedBright", "whiteBright"],
};

const inspectMeta = (meta: Record<string, unknown>) =>
  inspect(redactSensitive(meta), {
    colors: true,
    depth: null,
    compact: false,
    breakLength: 80,
  });

const formatPretty = (msg: string, meta?: Record<string, unknown>) =>
  meta ? [`${msg}\n${inspectMeta(meta)}`] : [msg];

const formatRaw = (msg: string, meta?: Record<string, unknown>) =>
  meta ? [msg, redactSensitive(meta)] : [msg];

const mergeMeta = (
  context: Record<string, unknown>,
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const hasContext = Object.keys(context).length > 0;
  if (!hasContext && !meta) return undefined;
  if (!hasContext) return meta;
  if (!meta) return context;
  return { ...context, ...meta };
};

const toLogger = (tslog: TsLog<ILogObj>, context: Record<string, unknown> = {}): Logger => {
  const format = tslog.settings.type === "pretty" ? formatPretty : formatRaw;
  const emit =
    (level: "trace" | "debug" | "info" | "warn" | "error") =>
    (msg: string, meta?: Record<string, unknown>) =>
      tslog[level](...format(msg, mergeMeta(context, meta)));

  return {
    trace: emit("trace"),
    debug: emit("debug"),
    info: emit("info"),
    warn: emit("warn"),
    error: emit("error"),
    withTag: (tag) => {
      const parent = tslog.settings.name;
      const name = parent ? `${parent}:${tag}` : tag;
      return toLogger(tslog.getSubLogger({ name }), context);
    },
    withContext: (extra) => toLogger(tslog, { ...context, ...extra }),
  };
};

export const createTsLogLogger = ({ level, name }: LoggerOptions): Logger =>
  toLogger(
    new TsLog<ILogObj>({
      name,
      type: "pretty",
      minLevel: TSLOG_LEVEL[level],
      prettyLogTemplate: "[{{hh}}:{{MM}}:{{ss}}][{{name}}] {{logLevelName}} ",
      prettyLogStyles: STYLES,
    }),
  );
