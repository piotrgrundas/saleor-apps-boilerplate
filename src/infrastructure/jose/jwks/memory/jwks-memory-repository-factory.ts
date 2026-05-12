import NodeCache from "@cacheable/node-cache";
import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result";
import type { JwksErrorCode } from "@/domain/errors/scopes/jwks";
import type { JsonWebKeySet, JWKSRepositoryFactory } from "@/domain/ports/jwks-repository";
import { getErrorMessage } from "@/lib/error/helpers";

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

const jwksUrlFor = (issuer: string): string => {
  const { origin } = new URL(issuer);
  return `${origin}/.well-known/jwks.json`;
};

export const createJwksRepositoryFactory: JWKSRepositoryFactory = ({ logger }) => {
  const cache = new NodeCache<JsonWebKeySet>({ stdTTL: CACHE_TTL_SECONDS });

  const fetchJwks = async (jwksUrl: string): AsyncResult<JsonWebKeySet, JwksErrorCode> => {
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

      const data = (await response.json()) as JsonWebKeySet;

      return ok(data);
    } catch (error) {
      logger.error("JWKS fetch failed", { jwksUrl, cause: error });

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
    async get({ issuer, forceRefresh = false }) {
      const jwksUrl = jwksUrlFor(issuer);

      if (!forceRefresh) {
        const cached = cache.get(jwksUrl) as JsonWebKeySet | undefined;

        if (cached) return ok(cached);
      }

      const result = await fetchJwks(jwksUrl);

      if (result.isOk()) cache.set(jwksUrl, result.value);

      return result;
    },

    async set({ issuer, jwks }) {
      cache.set(jwksUrlFor(issuer), jwks);

      return ok(undefined);
    },
  };
};
