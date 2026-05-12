import type { ErrorCodeFormat } from "../format";

export const JWT_ERROR_CODES = [
  "JWT_VERIFICATION_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type JwtErrorCode = (typeof JWT_ERROR_CODES)[number];
