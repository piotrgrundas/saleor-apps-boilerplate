import { beforeEach, describe, expect, vi } from "vite-plus/test";

import type { SaleorAppConfig } from "@/infrastructure/integrations/saleor/app-config/schema";
import { it } from "@/lib/test/it";
import { createTestContext } from "@/lib/test/mock";

import { createAwsParameterStoreAppConfigRepository } from "./aws-parameter-store-app-config-repository";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: class {
    send = sendMock;
  },
  GetParameterCommand: class {
    constructor(public input: unknown) {}
  },
  PutParameterCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteParameterCommand: class {
    constructor(public input: unknown) {}
  },
  ParameterNotFound: class extends Error {
    constructor() {
      super("ParameterNotFound");
      this.name = "ParameterNotFound";
    }
  },
}));

const TEST_CONFIG: SaleorAppConfig = {
  saleorDomain: "test.saleor.cloud",
  authToken: "test-token",
  saleorAppId: "app-123",
  saleorApiUrl: "https://test.saleor.cloud/graphql/",
};

const OPTIONS = {
  configPath: "/saleor/app-config",
};

beforeEach(() => {
  sendMock.mockReset();
});

describe("createAwsParameterStoreAppConfigRepository", () => {
  describe("get", () => {
    it("returns null when parameter not found", async () => {
      // given
      const { ParameterNotFound } = await import("@aws-sdk/client-ssm");
      sendMock.mockRejectedValueOnce(new ParameterNotFound({ $metadata: {}, message: "" }));
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get("missing.domain", createTestContext());

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it("returns config for existing domain", async () => {
      // given
      sendMock.mockResolvedValueOnce({ Parameter: { Value: JSON.stringify(TEST_CONFIG) } });
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get(TEST_CONFIG.saleorDomain, createTestContext());

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(TEST_CONFIG);
    });

    it("requests parameter with WithDecryption=true", async () => {
      // given
      sendMock.mockResolvedValueOnce({ Parameter: { Value: JSON.stringify(TEST_CONFIG) } });
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      await repo.get(TEST_CONFIG.saleorDomain, createTestContext());

      // then
      expect(sendMock).toHaveBeenCalledTimes(1);
      const call = sendMock.mock.calls[0][0];
      expect(call.input.Name).toBe(`/saleor/app-config/${TEST_CONFIG.saleorDomain}`);
      expect(call.input.WithDecryption).toBe(true);
    });

    it("normalizes parameter path without leading slash", async () => {
      // given
      sendMock.mockResolvedValueOnce({ Parameter: { Value: JSON.stringify(TEST_CONFIG) } });
      const repo = createAwsParameterStoreAppConfigRepository({
        ...OPTIONS,
        configPath: "saleor-app-config",
      });

      // when
      await repo.get(TEST_CONFIG.saleorDomain, createTestContext());

      // then
      const call = sendMock.mock.calls[0][0];
      expect(call.input.Name).toBe(`/saleor-app-config/${TEST_CONFIG.saleorDomain}`);
    });

    it("strips trailing slash from parameter path", async () => {
      // given
      sendMock.mockResolvedValueOnce({ Parameter: { Value: JSON.stringify(TEST_CONFIG) } });
      const repo = createAwsParameterStoreAppConfigRepository({
        ...OPTIONS,
        configPath: "/saleor/app-config/",
      });

      // when
      await repo.get(TEST_CONFIG.saleorDomain, createTestContext());

      // then
      const call = sendMock.mock.calls[0][0];
      expect(call.input.Name).toBe(`/saleor/app-config/${TEST_CONFIG.saleorDomain}`);
    });

    it("returns null when value missing", async () => {
      // given
      sendMock.mockResolvedValueOnce({ Parameter: { Value: undefined } });
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get("any.domain", createTestContext());

      // then
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it("returns APP_CONFIG_READ_ERROR when client throws", async () => {
      // given
      sendMock.mockRejectedValueOnce(new Error("access denied"));
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.get("any.domain", createTestContext());

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()[0].code).toBe("APP_CONFIG_READ_ERROR");
      expect(result._unsafeUnwrapErr()[0].message).toContain("access denied");
    });
  });

  describe("set", () => {
    it("writes parameter as SecureString with Overwrite=true", async () => {
      // given
      sendMock.mockResolvedValueOnce({});
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.set(
        { saleorDomain: TEST_CONFIG.saleorDomain, config: TEST_CONFIG },
        createTestContext(),
      );

      // then
      expect(result.isOk()).toBe(true);
      expect(sendMock).toHaveBeenCalledTimes(1);
      const call = sendMock.mock.calls[0][0];
      expect(call.input.Name).toBe(`/saleor/app-config/${TEST_CONFIG.saleorDomain}`);
      expect(call.input.Type).toBe("SecureString");
      expect(call.input.Overwrite).toBe(true);
      expect(JSON.parse(call.input.Value)).toEqual(TEST_CONFIG);
    });

    it("includes KeyId when kmsKeyId provided", async () => {
      // given
      sendMock.mockResolvedValueOnce({});
      const repo = createAwsParameterStoreAppConfigRepository({
        ...OPTIONS,
        kmsKeyId: "alias/custom-key",
      });

      // when
      await repo.set(
        { saleorDomain: TEST_CONFIG.saleorDomain, config: TEST_CONFIG },
        createTestContext(),
      );

      // then
      const call = sendMock.mock.calls[0][0];
      expect(call.input.KeyId).toBe("alias/custom-key");
    });

    it("returns APP_CONFIG_WRITE_ERROR when put fails", async () => {
      // given
      sendMock.mockRejectedValueOnce(new Error("write failed"));
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.set(
        { saleorDomain: TEST_CONFIG.saleorDomain, config: TEST_CONFIG },
        createTestContext(),
      );

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()[0].code).toBe("APP_CONFIG_WRITE_ERROR");
    });
  });

  describe("delete", () => {
    it("deletes parameter by name", async () => {
      // given
      sendMock.mockResolvedValueOnce({});
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.delete(TEST_CONFIG.saleorDomain, createTestContext());

      // then
      expect(result.isOk()).toBe(true);
      const call = sendMock.mock.calls[0][0];
      expect(call.input.Name).toBe(`/saleor/app-config/${TEST_CONFIG.saleorDomain}`);
    });

    it("returns ok when parameter already missing", async () => {
      // given
      const { ParameterNotFound } = await import("@aws-sdk/client-ssm");
      sendMock.mockRejectedValueOnce(new ParameterNotFound({ $metadata: {}, message: "" }));
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.delete("missing.domain", createTestContext());

      // then
      expect(result.isOk()).toBe(true);
    });

    it("returns APP_CONFIG_DELETE_ERROR when delete fails", async () => {
      // given
      sendMock.mockRejectedValueOnce(new Error("delete failed"));
      const repo = createAwsParameterStoreAppConfigRepository(OPTIONS);

      // when
      const result = await repo.delete(TEST_CONFIG.saleorDomain, createTestContext());

      // then
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()[0].code).toBe("APP_CONFIG_DELETE_ERROR");
    });
  });
});
