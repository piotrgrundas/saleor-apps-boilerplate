import { APP_CONFIG_ERROR_CODES } from "./scopes/app-config";
import { GRAPHQL_ERROR_CODES } from "./scopes/graphql";
import { JWKS_ERROR_CODES } from "./scopes/jwks";
import { JWT_ERROR_CODES } from "./scopes/jwt";
import { SALEOR_ERROR_CODES } from "./scopes/saleor";
import { SALEOR_INSTALL_ERROR_CODES } from "./scopes/saleor-install";
import { VALIDATION_ERROR_CODES } from "./scopes/validation";

export const ErrorCodes = [
  ...APP_CONFIG_ERROR_CODES,
  ...GRAPHQL_ERROR_CODES,
  ...JWKS_ERROR_CODES,
  ...JWT_ERROR_CODES,
  ...SALEOR_INSTALL_ERROR_CODES,
  ...SALEOR_ERROR_CODES,
  ...VALIDATION_ERROR_CODES,
] as const;

export type ErrorCode = (typeof ErrorCodes)[number];

export type Error<T extends ErrorCode = ErrorCode> = {
  code: T;
  message: string;
  field?: string;
  details?: unknown;
};
