import { LOGGING_REDACT_KEYS } from "@/constants";

export const redactSensitive = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (LOGGING_REDACT_KEYS.some((pattern) => pattern.test(key))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
};
