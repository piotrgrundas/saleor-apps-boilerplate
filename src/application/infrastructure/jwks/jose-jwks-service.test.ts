import { describe, expect, it } from "vite-plus/test";
import { exportJWK, FlattenedSign, generateKeyPair } from "jose";
import { err, ok } from "neverthrow";

import type { JWKSRepository } from "@/application/domain/repositories/jwks-repository";
import { JoseJWKSService } from "./jose-jwks-service";

const DOMAIN = "test.saleor.cloud";

const createSignedPayload = async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";

  const rawPayload = '{"iss":"saleor","data":"test"}';
  const encoder = new TextEncoder();

  const jws = await new FlattenedSign(encoder.encode(rawPayload))
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .sign(privateKey);

  const payload = jws.payload;
  const signature = `${jws.protected}.${jws.signature}`;

  return { jwk, payload, signature, rawPayload };
};

const createMockRepo = (keys: JsonWebKey[]): JWKSRepository => ({
  getKeys: async () => ok(keys),
});

const createFailingRepo = (): JWKSRepository => ({
  getKeys: async () => err({ code: "JWKS_FETCH_ERROR", message: "fetch failed" }),
});

describe("JoseJWKSService", () => {
  it("verifies a valid signature", async () => {
    // given
    const { jwk, payload, signature, rawPayload } = await createSignedPayload();
    const service = new JoseJWKSService(createMockRepo([jwk]));

    // when
    const result = await service.verify(payload, signature, DOMAIN);

    // then
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(rawPayload);
  });

  it("returns JWKS_NO_MATCHING_KEY_ERROR when no key matches", async () => {
    // given
    const { payload, signature } = await createSignedPayload();
    const wrongKey: JsonWebKey = { kty: "RSA", n: "bad", e: "AQAB" };
    const service = new JoseJWKSService(createMockRepo([wrongKey]));

    // when
    const result = await service.verify(payload, signature, DOMAIN);

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("JWKS_NO_MATCHING_KEY_ERROR");
  });

  it("returns JWKS_NO_MATCHING_KEY_ERROR when keys are empty", async () => {
    // given
    const service = new JoseJWKSService(createMockRepo([]));

    // when
    const result = await service.verify("payload", "header.sig", DOMAIN);

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("JWKS_NO_MATCHING_KEY_ERROR");
  });

  it("propagates repository fetch error", async () => {
    // given
    const service = new JoseJWKSService(createFailingRepo());

    // when
    const result = await service.verify("payload", "header.sig", DOMAIN);

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("JWKS_FETCH_ERROR");
  });

  it("retries with forceRefresh on first failure", async () => {
    // given
    const { jwk, payload, signature } = await createSignedPayload();
    let callCount = 0;
    const repo: JWKSRepository = {
      getKeys: async (_domain, forceRefresh) => {
        callCount++;
        if (!forceRefresh) return ok([]);
        return ok([jwk]);
      },
    };
    const service = new JoseJWKSService(repo);

    // when
    const result = await service.verify(payload, signature, DOMAIN);

    // then
    expect(result.isOk()).toBe(true);
    expect(callCount).toBe(2);
  });

  it("skips invalid keys and continues", async () => {
    // given
    const { jwk, payload, signature } = await createSignedPayload();
    const invalidKey: JsonWebKey = { kty: "invalid" };
    const service = new JoseJWKSService(createMockRepo([invalidKey, jwk]));

    // when
    const result = await service.verify(payload, signature, DOMAIN);

    // then
    expect(result.isOk()).toBe(true);
  });
});
