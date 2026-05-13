import NodeCache from "@cacheable/node-cache";
import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result";
import type { JwksErrorCode } from "@/domain/errors/scopes/jwks";
import type {
  JsonWebKeySet,
  JWKSRepository,
  JWKSRepositoryOptions,
} from "@/domain/ports/jwks-repository";
import type { Logger } from "@/domain/ports/logger";
import { getErrorMessage } from "@/lib/error/helpers";

const DEFAULT_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

const jwksUrlFor = (issuer: string): string => {
  const { origin } = new URL(issuer);
  return `${origin}/.well-known/jwks.json`;
};

export const createJwksRepositoryFactory = (opts?: JWKSRepositoryOptions): JWKSRepository => {
  const stdTTL = opts?.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  const cache = new NodeCache<JsonWebKeySet>({ stdTTL });

  const fetchJwks = async ({
    jwksUrl,
    logger,
  }: {
    jwksUrl: string;
    logger: Logger;
  }): AsyncResult<JsonWebKeySet, JwksErrorCode> => {
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
    async get({ issuer, forceRefresh = false }, ctx) {
      const jwksUrl = jwksUrlFor(issuer);

      if (!forceRefresh) {
        const cached = cache.get(jwksUrl) as JsonWebKeySet | undefined;

        if (cached) {
          ctx.logger.debug("JWKS cache hit", { jwksUrl });
          return ok(cached);
        }
      }

      const result = await fetchJwks({ jwksUrl, logger: ctx.logger });

      if (result.isOk()) {
        cache.set(jwksUrl, result.value);
      } else {
        ctx.logger.error("JWKS fetch failed", { jwksUrl, cause: result.error });
      }

      return result;
    },

    async set({ issuer, jwks }, _ctx) {
      cache.set(jwksUrlFor(issuer), jwks);

      return ok(undefined);
    },
  };
};
