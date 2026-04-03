import { describe, expect, it } from "vite-plus/test";

import { isDomainAllowed } from "./allowlist";

describe("isDomainAllowed", () => {
  it("allows all domains with wildcard", () => {
    expect(isDomainAllowed("any.domain.com", ["*"])).toBe(true);
  });

  it("allows exact domain match", () => {
    expect(isDomainAllowed("my-store.saleor.cloud", ["my-store.saleor.cloud"])).toBe(true);
  });

  it("rejects non-matching domains", () => {
    expect(isDomainAllowed("other.domain.com", ["my-store.saleor.cloud"])).toBe(false);
  });

  it("supports glob patterns", () => {
    expect(isDomainAllowed("my-store.saleor.cloud", ["*.saleor.cloud"])).toBe(true);
    expect(isDomainAllowed("another.saleor.cloud", ["*.saleor.cloud"])).toBe(true);
    expect(isDomainAllowed("other.domain.com", ["*.saleor.cloud"])).toBe(false);
  });

  it("supports multiple allowed domains", () => {
    const allowed = ["store1.saleor.cloud", "store2.saleor.cloud"];
    expect(isDomainAllowed("store1.saleor.cloud", allowed)).toBe(true);
    expect(isDomainAllowed("store2.saleor.cloud", allowed)).toBe(true);
    expect(isDomainAllowed("store3.saleor.cloud", allowed)).toBe(false);
  });
});
