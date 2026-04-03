export * from "./app-config";
export * from "./install-app";
export * from "./jwks";
export * from "./jwt";
export * from "./store";
export * from "./validate-webhook";
export * from "./validation";

import type { AppConfigErrorDefs } from "./app-config";
import type { InstallAppErrorDefs } from "./install-app";
import type { JwksErrorDefs } from "./jwks";
import type { JwtErrorDefs } from "./jwt";
import type { StoreErrorDefs } from "./store";
import type { ValidateWebhookErrorDefs } from "./validate-webhook";
import type { ValidationErrorDefs } from "./validation";

type AllErrorDefs = AppConfigErrorDefs &
  InstallAppErrorDefs &
  JwksErrorDefs &
  JwtErrorDefs &
  StoreErrorDefs &
  ValidateWebhookErrorDefs &
  ValidationErrorDefs;

export type DomainErrorCode = keyof AllErrorDefs;

type DomainErrorContextShape<T extends DomainErrorCode> = [AllErrorDefs[T]] extends [never]
  ? { context?: Record<string, unknown> }
  : { context: AllErrorDefs[T] };

export type DomainError<T extends DomainErrorCode = DomainErrorCode> = T extends DomainErrorCode
  ? { code: T; message: string; cause?: DomainError } & DomainErrorContextShape<T>
  : never;
