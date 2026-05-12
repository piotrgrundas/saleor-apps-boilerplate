import { inspect } from "node:util";
import { Logger as TsLog, type ILogObj } from "tslog";

import type { Logger } from "@/domain/ports/logger";

import type { LogLevel } from "../types";
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

const toLogger = (tslog: TsLog<ILogObj>): Logger => {
  const format = tslog.settings.type === "pretty" ? formatPretty : formatRaw;
  return {
    trace: (msg, meta) => tslog.trace(...format(msg, meta)),
    debug: (msg, meta) => tslog.debug(...format(msg, meta)),
    info: (msg, meta) => tslog.info(...format(msg, meta)),
    warn: (msg, meta) => tslog.warn(...format(msg, meta)),
    error: (msg, meta) => tslog.error(...format(msg, meta)),
    withTag: (tag) => {
      const parent = tslog.settings.name;
      const name = parent ? `${parent}:${tag}` : tag;
      return toLogger(tslog.getSubLogger({ name }));
    },
  };
};

export const createTsLogLogger = ({ level, name }: { level: LogLevel; name?: string }): Logger =>
  toLogger(
    new TsLog<ILogObj>({
      name,
      type: "pretty",
      minLevel: TSLOG_LEVEL[level],
      prettyLogTemplate: "[{{hh}}:{{MM}}:{{ss}}][{{name}}] {{logLevelName}} ",
      prettyLogStyles: STYLES,
    }),
  );
