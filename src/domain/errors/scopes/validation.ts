import type { ErrorCodeFormat } from "../format";

export type ValidationIssue = {
  message: string;
  path: PropertyKey[];
  code?: string;
};

export const VALIDATION_ERROR_CODES = [
  "VALIDATION_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type ValidationErrorCode = (typeof VALIDATION_ERROR_CODES)[number];
