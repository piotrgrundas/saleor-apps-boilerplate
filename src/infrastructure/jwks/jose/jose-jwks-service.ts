import { flattenedVerify, importJWK } from "jose";
import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result";
import type { JwksErrorCode } from "@/domain/errors/scopes/jwks";
import type { JWKSRepository } from "@/domain/ports/jwks-repository";
import type { JWKSService } from "@/domain/ports/jwks-service";

export const createJoseJWKSService = (jwksRepository: JWKSRepository): JWKSService => {
  const tryVerify = async (input: {
    payload: string;
    signature: string;
    saleorDomain: string;
    forceRefresh: boolean;
  }): AsyncResult<string, JwksErrorCode> => {
    const { payload, signature, saleorDomain, forceRefresh } = input;
    const keysResult = await jwksRepository.getKeys({ saleorDomain, forceRefresh });
    if (keysResult.isErr()) return err(keysResult.error);

    for (const jwk of keysResult.value) {
      let key: Awaited<ReturnType<typeof importJWK>>;
      try {
        key = await importJWK(jwk);
      } catch {
        continue;
      }

      try {
        const jws = {
          payload,
          protected: signature.split(".")[0],
          signature: signature.split(".").slice(-1)[0],
        };

        const result = await flattenedVerify(jws, key);
        return ok(new TextDecoder().decode(result.payload));
      } catch {}
    }

    return err([
      {
        code: "JWKS_NO_MATCHING_KEY_ERROR",
        message: "No matching key found in JWKS",
      },
    ]);
  };

  return {
    async verify({ payload, signature, saleorDomain }) {
      const result = await tryVerify({ payload, signature, saleorDomain, forceRefresh: false });
      if (result.isOk()) return result;

      // Retry with fresh keys (handles key rotation)
      return tryVerify({ payload, signature, saleorDomain, forceRefresh: true });
    },
  };
};
