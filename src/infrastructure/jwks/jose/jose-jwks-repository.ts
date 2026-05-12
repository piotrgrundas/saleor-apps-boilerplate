import NodeCache from "@cacheable/node-cache";
import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result";
import type { JwksErrorCode } from "@/domain/errors/scopes/jwks";
import type { JWKSRepository } from "@/domain/ports/jwks-repository";
import { getErrorMessage } from "@/lib/error/helpers";

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

type JWKSResponse = {
  keys: JsonWebKey[];
};

export const createJoseJWKSRepository = (): JWKSRepository => {
  const cache = new NodeCache<JsonWebKey[]>({ stdTTL: CACHE_TTL_SECONDS });

  const fetchJWKS = async (saleorDomain: string): AsyncResult<JsonWebKey[], JwksErrorCode> => {
    const jwksUrl = `https://${saleorDomain}/.well-known/jwks.json`;

    try {
      const response = await fetch(jwksUrl);
      if (!response.ok) {
        return err([
          {
            code: "JWKS_FETCH_ERROR",
            message: `Failed to fetch JWKS from ${jwksUrl}: ${response.status}`,
          },
        ]);
      }

      const data = (await response.json()) as JWKSResponse;
      return ok(data.keys);
    } catch (error) {
      return err([
        {
          code: "JWKS_FETCH_ERROR",
          message: `Failed to fetch JWKS from ${jwksUrl}: ${getErrorMessage(error)}`,
          details: { cause: error },
        },
      ]);
    }
  };

  return {
    async getKeys({ saleorDomain, forceRefresh = false }) {
      const cacheKey = `jwks:${saleorDomain}`;

      if (!forceRefresh) {
        const cached = cache.get(cacheKey);
        if (cached) return ok(cached);
      }

      const result = await fetchJWKS(saleorDomain);
      if (result.isOk()) {
        cache.set(cacheKey, result.value);
      }

      return result;
    },
  };
};
