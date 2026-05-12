import type { Context } from "../context";
import type { AsyncResult } from "../errors/result";
import type { JwksErrorCode } from "../errors/scopes/jwks";
import type { JwtErrorCode } from "../errors/scopes/jwt";

export type JWTPayload = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

export type JoseAuthService = {
  verifyJWT(
    opts: { token: string; issuer: string; forceRefresh?: boolean },
    ctx: Context,
  ): AsyncResult<JWTPayload, JwtErrorCode>;

  verifyJWS(
    opts: { jws: string; issuer: string; forceRefresh?: boolean },
    ctx: Context,
  ): AsyncResult<string, JwksErrorCode>;

  verifyJWSDetached(
    opts: { jws: string; payload: string; issuer: string; forceRefresh?: boolean },
    ctx: Context,
  ): AsyncResult<void, JwksErrorCode>;
};
