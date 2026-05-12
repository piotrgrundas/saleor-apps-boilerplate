import { createRemoteJWKSet, jwtVerify } from "jose";
import { err, ok } from "neverthrow";

import type { JWTPayload, JWTService } from "@/domain/ports/jwt-service";
import { getErrorMessage } from "@/lib/error/helpers";

export const createJoseJWTService = (): JWTService => ({
  async verify({ token, jwksUrl }) {
    try {
      const jwks = createRemoteJWKSet(new URL(jwksUrl));
      const { payload } = await jwtVerify(token, jwks);
      return ok(payload as JWTPayload);
    } catch (error) {
      return err([
        {
          code: "JWT_VERIFICATION_ERROR",
          message: `JWT verification failed: ${getErrorMessage(error)}`,
          details: { cause: error },
        },
      ]);
    }
  },
});
