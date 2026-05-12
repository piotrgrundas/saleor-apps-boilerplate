import type { Context } from "../context";
import type { AsyncResult } from "../errors/result";
import type { JwksErrorCode } from "../errors/scopes/jwks";

export type JsonWebKeySet = {
  keys: JsonWebKey[];
};

export type JWKSRepository = {
  get(
    opts: { issuer: string; forceRefresh?: boolean },
    ctx: Context,
  ): AsyncResult<JsonWebKeySet, JwksErrorCode>;
  set(opts: { issuer: string; jwks: JsonWebKeySet }, ctx: Context): AsyncResult<void>;
};

export type JWKSRepositoryFactory = () => JWKSRepository;
