import { afterEach, describe, expect, vi } from "vite-plus/test";
import { it } from "@/lib/test/it";
import { createServer } from "node:http";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { createJoseJWTService } from "./jose-jwt-service";

let server: ReturnType<typeof createServer>;
let jwksUrl: string;

const setupJwksServer = async (keys: JsonWebKey[]) => {
  server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ keys }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (typeof address === "object" && address) {
    jwksUrl = `http://localhost:${address.port}`;
  }
};

const createTestJwk = async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  jwk.use = "sig";
  return { privateKey, jwk };
};

const stopServer = () =>
  new Promise<void>((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });

afterEach(async () => {
  await stopServer();
  vi.restoreAllMocks();
});

describe("createJoseJWTService", () => {
  it("verifies a valid JWT", async () => {
    // given
    const { privateKey, jwk } = await createTestJwk();
    await setupJwksServer([jwk]);
    const token = await new SignJWT({ sub: "user-123", iss: "saleor" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setExpirationTime("1h")
      .sign(privateKey);
    const service = createJoseJWTService();

    // when
    const result = await service.verify({ token, jwksUrl });

    // then
    expect(result.isOk()).toBe(true);
    const payload = result._unsafeUnwrap();
    expect(payload.sub).toBe("user-123");
    expect(payload.iss).toBe("saleor");
  });

  it("returns JWT_VERIFICATION_ERROR for invalid token", async () => {
    // given
    const { jwk } = await createTestJwk();
    await setupJwksServer([jwk]);
    const service = createJoseJWTService();

    // when
    const result = await service.verify({ token: "invalid.jwt.token", jwksUrl });

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("JWT_VERIFICATION_ERROR");
  });

  it("returns JWT_VERIFICATION_ERROR for expired token", async () => {
    // given
    const { privateKey, jwk } = await createTestJwk();
    await setupJwksServer([jwk]);
    const token = await new SignJWT({ sub: "user-123" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setExpirationTime("-1h")
      .sign(privateKey);
    const service = createJoseJWTService();

    // when
    const result = await service.verify({ token, jwksUrl });

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("JWT_VERIFICATION_ERROR");
  });
});
