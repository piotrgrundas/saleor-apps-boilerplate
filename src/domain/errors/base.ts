import { APP_CONFIG_ERROR_CODES } from "./scopes/app-config";
import { INSTALL_APP_ERROR_CODES } from "./scopes/install-app";
import { JWKS_ERROR_CODES } from "./scopes/jwks";
import { JWT_ERROR_CODES } from "./scopes/jwt";
import { STORE_ERROR_CODES } from "./scopes/store";
import { VALIDATE_WEBHOOK_ERROR_CODES } from "./scopes/validate-webhook";
import { VALIDATION_ERROR_CODES } from "./scopes/validation";

export const ErrorCodes = [
  ...APP_CONFIG_ERROR_CODES,
  ...INSTALL_APP_ERROR_CODES,
  ...JWKS_ERROR_CODES,
  ...JWT_ERROR_CODES,
  ...STORE_ERROR_CODES,
  ...VALIDATE_WEBHOOK_ERROR_CODES,
  ...VALIDATION_ERROR_CODES,
] as const;

export type ErrorCode = (typeof ErrorCodes)[number];

export type Error<T extends ErrorCode = ErrorCode> = {
  code: T;
  message: string;
  field?: string;
  details?: unknown;
};
