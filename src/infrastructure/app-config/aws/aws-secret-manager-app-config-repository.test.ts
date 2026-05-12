import { beforeEach, describe, expect, vi } from "vite-plus/test";
import { it } from "@/lib/test/it";

import type { SaleorAppConfig } from "@/infrastructure/integrations/saleor/app-config/schema";
import { createAwsSecretManagerAppConfigRepository } from "./aws-secret-manager-app-config-repository";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: class {
    send = sendMock;
  },
  GetSecretValueCommand: class {
    constructor(public input: unknown) {}
  },
  PutSecretValueCommand: class {
    constructor(public input: unknown) {}
  },
}));

const TEST_CONFIG: SaleorAppConfig = {
  saleorDomain: "test.saleor.cloud",
  authToken: "test-token",
  saleorAppId: "app-123",
  saleorApiUrl: "https://test.saleor.cloud/graphql/",
};

const OPTIONS = {
  region: "us-east-1",
  secretPath: "test/secret",
};

beforeEach(() => {
  sendMock.mockReset();
});

describe("createAwsSecretManagerAppConfigRepository", () => {
  describe("get", () => {
    it("returns null for non-existent domain", async () => {
      // given
      sendMock.mockResolvedValueOnce({ SecretString: JSON.stringify({}) });
      const repo = createAwsSecretManagerAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get("unknown.domain");

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it("returns config for existing domain", async () => {
      // given
      const configMap = { [TEST_CONFIG.saleorDomain]: TEST_CONFIG };
      sendMock.mockResolvedValueOnce({ SecretString: JSON.stringify(configMap) });
      const repo = createAwsSecretManagerAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get(TEST_CONFIG.saleorDomain);

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(TEST_CONFIG);
    });

    it("returns null when SecretString is undefined", async () => {
      // given
      sendMock.mockResolvedValueOnce({ SecretString: undefined });
      const repo = createAwsSecretManagerAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get("any.domain");

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it("returns APP_CONFIG_READ_ERROR when SecretString is invalid", async () => {
      // given
      sendMock.mockResolvedValueOnce({ SecretString: "not-valid-json{}{}" });
      const repo = createAwsSecretManagerAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get("any.domain");

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()[0].code).toBe("APP_CONFIG_READ_ERROR");
    });

    it("returns APP_CONFIG_READ_ERROR when client throws", async () => {
      // given
      sendMock.mockRejectedValueOnce(new Error("access denied"));
      const repo = createAwsSecretManagerAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get("any.domain");

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()[0].code).toBe("APP_CONFIG_READ_ERROR");
      expect(result._unsafeUnwrapErr()[0].message).toContain("access denied");
    });
  });

  describe("set", () => {
    it("saves config to the map", async () => {
      // given
      sendMock
        .mockResolvedValueOnce({ SecretString: JSON.stringify({}) })
        .mockResolvedValueOnce({});
      const repo = createAwsSecretManagerAppConfigRepository(OPTIONS);

      // when
      const result = await repo.set({ saleorDomain: TEST_CONFIG.saleorDomain, config: TEST_CONFIG });

      // then
      expect(result.isOk()).toBe(true);
      expect(sendMock).toHaveBeenCalledTimes(2);
    });

    it("returns APP_CONFIG_WRITE_ERROR when put fails", async () => {
      // given
      sendMock
        .mockResolvedValueOnce({ SecretString: "{}" })
        .mockRejectedValueOnce(new Error("write failed"));
      const repo = createAwsSecretManagerAppConfigRepository(OPTIONS);

      // when
      const result = await repo.set({ saleorDomain: TEST_CONFIG.saleorDomain, config: TEST_CONFIG });

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()[0].code).toBe("APP_CONFIG_WRITE_ERROR");
    });
  });

  describe("delete", () => {
    it("removes config from the map", async () => {
      // given
      const configMap = { [TEST_CONFIG.saleorDomain]: TEST_CONFIG };
      sendMock
        .mockResolvedValueOnce({ SecretString: JSON.stringify(configMap) })
        .mockResolvedValueOnce({});
      const repo = createAwsSecretManagerAppConfigRepository(OPTIONS);

      // when
      const result = await repo.delete(TEST_CONFIG.saleorDomain);

      // then
      expect(result.isOk()).toBe(true);
      expect(sendMock).toHaveBeenCalledTimes(2);
      const putCall = sendMock.mock.calls[1][0];
      const saved = JSON.parse(putCall.input.SecretString);
      expect(saved[TEST_CONFIG.saleorDomain]).toBeUndefined();
    });
  });
});
