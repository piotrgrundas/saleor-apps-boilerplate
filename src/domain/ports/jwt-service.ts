import type { AsyncResult } from "../errors/result";
import type { JwtErrorCode } from "../errors/scopes/jwt";

export type JWTPayload = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

export type JWTService = {
  verify(input: { token: string; jwksUrl: string }): AsyncResult<JWTPayload, JwtErrorCode>;
};
