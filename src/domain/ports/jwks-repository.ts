import type { AsyncResult } from "../errors/result";
import type { JwksErrorCode } from "../errors/scopes/jwks";
import type { Logger } from "./logger";

export type JsonWebKeySet = {
  keys: JsonWebKey[];
};

export type JWKSRepositoryFactoryOpts = {
  logger: Logger;
};

export type JWKSRepository = {
  get(opts: {
    issuer: string;
    forceRefresh?: boolean;
  }): AsyncResult<JsonWebKeySet, JwksErrorCode>;
  set(opts: { issuer: string; jwks: JsonWebKeySet }): AsyncResult<void>;
};

export type JWKSRepositoryFactory = (
  opts: JWKSRepositoryFactoryOpts,
) => JWKSRepository;
