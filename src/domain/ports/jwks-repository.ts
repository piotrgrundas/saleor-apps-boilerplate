import type { AsyncResult } from "../errors/result";
import type { JwksErrorCode } from "../errors/scopes/jwks";

export type JWKSRepository = {
  getKeys(input: {
    saleorDomain: string;
    forceRefresh?: boolean;
  }): AsyncResult<JsonWebKey[], JwksErrorCode>;
};
