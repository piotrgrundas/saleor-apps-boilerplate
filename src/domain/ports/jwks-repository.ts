import type { Context } from "../context";
import type { AsyncResult } from "../errors/result";
import type { JwksErrorCode } from "../errors/scopes/jwks";

export type JsonWebKeySet = {
  keys: JsonWebKey[];
};

/**
 * Construction options shared by all `JWKSRepository` adapters.
 */
export type JWKSRepositoryOptions = {
  /**
   * Cache lifetime for fetched JWKS in seconds. Adapters that don't cache
   * may ignore this. Defaults to 30 days when omitted.
   */
  cacheTtlSeconds?: number;
};

export type JWKSRepository = {
  get(
    opts: { issuer: string; forceRefresh?: boolean },
    ctx: Context,
  ): AsyncResult<JsonWebKeySet, JwksErrorCode>;
  set(opts: { issuer: string; jwks: JsonWebKeySet }, ctx: Context): AsyncResult<void>;
};
