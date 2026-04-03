import { describe, expect, it, vi } from "vite-plus/test";

import type { AppConfig } from "@/application/domain/objects/app-config";
import { AwsSecretManagerAppConfigRepository } from "./aws-secret-manager-app-config-repository";

const TEST_CONFIG: AppConfig = {
  saleorDomain: "test.saleor.cloud",
  authToken: "test-token",
  saleorAppId: "app-123",
  saleorApiUrl: "https://test.saleor.cloud/graphql/",
};

const OPTIONS = {
  region: "us-east-1",
  secretPath: "test/secret",
};

const createMockClient = (secretString?: string) => {
  const sendMock = vi.fn(() =>
    Promise.resolve({
      SecretString: secretString,
    }),
  );

  const repo = new AwsSecretManagerAppConfigRepository(OPTIONS);
  // biome-ignore lint/suspicious/noExplicitAny: test override
  (repo as any).__client = { send: sendMock };

  return { repo, sendMock };
};

describe("AwsSecretManagerAppConfigRepository", () => {
  describe("get", () => {
    it("returns null for non-existent domain", async () => {
      // given
      const { repo } = createMockClient(JSON.stringify({}));

      // when
      const result = await repo.get("unknown.domain");

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it("returns config for existing domain", async () => {
      // given
      const configMap = { [TEST_CONFIG.saleorDomain]: TEST_CONFIG };
      const { repo } = createMockClient(JSON.stringify(configMap));

      // when
      const result = await repo.get(TEST_CONFIG.saleorDomain);

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(TEST_CONFIG);
    });

    it("returns null when SecretString is undefined", async () => {
      // given
      const { repo } = createMockClient(undefined);

      // when
      const result = await repo.get("any.domain");

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it("returns APP_CONFIG_READ_ERROR when SecretString is invalid", async () => {
      // given
      const { repo } = createMockClient("not-valid-json{}{}");

      // when
      const result = await repo.get("any.domain");

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe("APP_CONFIG_READ_ERROR");
    });

    it("returns APP_CONFIG_READ_ERROR when client throws", async () => {
      // given
      const repo = new AwsSecretManagerAppConfigRepository(OPTIONS);
      // biome-ignore lint/suspicious/noExplicitAny: test override
      (repo as any).__client = {
        send: vi.fn(() => Promise.reject(new Error("access denied"))),
      };

      // when
      const result = await repo.get("any.domain");

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe("APP_CONFIG_READ_ERROR");
      expect(result._unsafeUnwrapErr().message).toContain("access denied");
    });
  });

  describe("set", () => {
    it("saves config to the map", async () => {
      // given
      const { repo, sendMock } = createMockClient(JSON.stringify({}));

      // when
      const result = await repo.set(TEST_CONFIG.saleorDomain, TEST_CONFIG);

      // then
      expect(result.isOk()).toBe(true);
      expect(sendMock).toHaveBeenCalledTimes(2);
    });

    it("returns APP_CONFIG_WRITE_ERROR when put fails", async () => {
      // given
      let callCount = 0;
      const repo = new AwsSecretManagerAppConfigRepository(OPTIONS);
      // biome-ignore lint/suspicious/noExplicitAny: test override
      (repo as any).__client = {
        send: vi.fn(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve({ SecretString: "{}" });
          return Promise.reject(new Error("write failed"));
        }),
      };

      // when
      const result = await repo.set(TEST_CONFIG.saleorDomain, TEST_CONFIG);

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe("APP_CONFIG_WRITE_ERROR");
    });
  });

  describe("delete", () => {
    it("removes config from the map", async () => {
      // given
      const configMap = { [TEST_CONFIG.saleorDomain]: TEST_CONFIG };
      const { repo, sendMock } = createMockClient(JSON.stringify(configMap));

      // when
      const result = await repo.delete(TEST_CONFIG.saleorDomain);

      // then
      expect(result.isOk()).toBe(true);
      expect(sendMock).toHaveBeenCalledTimes(2);
      // biome-ignore lint/suspicious/noExplicitAny: test assertion
      const putCall = (sendMock.mock.calls as any[])[1][0];
      const saved = JSON.parse(putCall.input.SecretString);
      expect(saved[TEST_CONFIG.saleorDomain]).toBeUndefined();
    });
  });
});
