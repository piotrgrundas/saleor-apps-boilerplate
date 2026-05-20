import { compactVerify, createLocalJWKSet, flattenedVerify, jwtVerify } from "jose";
import { err, ok } from "neverthrow";

import type { JoseAuthServiceProvider, JWTPayload } from "@/domain/ports/jose-auth-service";
import type { JWKSRepositoryProvider } from "@/domain/ports/jwks-repository";
import { getErrorMessage } from "@/lib/error/helpers";

type Deps = {
  jwksRepository: JWKSRepositoryProvider;
};

export const createJoseAuthService =
  ({ jwksRepository: jwksProvider }: Deps): JoseAuthServiceProvider =>
  (ctx) => {
    const jwksRepository = jwksProvider(ctx);

    return {
      async verifyJWT({ token, issuer, forceRefresh = false }) {
        const keysResult = await jwksRepository.get({ issuer, forceRefresh });
        if (keysResult.isErr()) {
          return err([
            {
              code: "JWT_VERIFICATION_ERROR",
              message: "JWKS fetch failed",
              details: { cause: keysResult.error },
            },
          ]);
        }

        try {
          const resolver = createLocalJWKSet(keysResult.value);
          const { payload } = await jwtVerify(token, resolver);
          return ok(payload as JWTPayload);
        } catch (e) {
          return err([
            {
              code: "JWT_VERIFICATION_ERROR",
              message: `JWT verification failed: ${getErrorMessage(e)}`,
              details: { cause: e },
            },
          ]);
        }
      },

      async verifyJWS({ jws, issuer, forceRefresh = false }) {
        const keysResult = await jwksRepository.get({ issuer, forceRefresh });
        if (keysResult.isErr()) return err(keysResult.error);

        try {
          const resolver = createLocalJWKSet(keysResult.value);
          const { payload } = await compactVerify(jws, resolver);
          return ok(new TextDecoder().decode(payload));
        } catch {
          return err([
            { code: "JWKS_NO_MATCHING_KEY_ERROR", message: "No matching key found in JWKS" },
          ]);
        }
      },

      async verifyJWSDetached({ jws, payload, issuer, forceRefresh = false }) {
        const [protectedHeader, signature] = jws.split("..");

        if (!protectedHeader || !signature) {
          return err([
            {
              code: "JWKS_NO_MATCHING_KEY_ERROR",
              message: "Invalid detached JWS format: expected protected..signature",
            },
          ]);
        }

        const keysResult = await jwksRepository.get({ issuer, forceRefresh });
        if (keysResult.isErr()) return err(keysResult.error);

        try {
          const resolver = createLocalJWKSet(keysResult.value);
          await flattenedVerify({ payload, protected: protectedHeader, signature }, resolver);
          return ok(undefined);
        } catch {
          return err([
            { code: "JWKS_NO_MATCHING_KEY_ERROR", message: "No matching key found in JWKS" },
          ]);
        }
      },
    };
  };
