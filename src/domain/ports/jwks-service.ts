import type { AsyncResult } from "../errors/result";
import type { JwksErrorCode } from "../errors/scopes/jwks";

export type JWKSService = {
  verify(input: {
    payload: string;
    signature: string;
    saleorDomain: string;
  }): AsyncResult<string, JwksErrorCode>;
};
