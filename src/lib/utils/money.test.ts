import { describe, expect } from "vite-plus/test";

import { it } from "@/lib/test/it";

import { fromCents, getCurrencyDecimals, toCents } from "./money";

describe("getCurrencyDecimals", () => {
  it("returns 2 for standard currencies", () => {
    expect(getCurrencyDecimals("USD")).toBe(2);
    expect(getCurrencyDecimals("EUR")).toBe(2);
    expect(getCurrencyDecimals("GBP")).toBe(2);
  });

  it("returns 0 for zero-decimal currencies", () => {
    expect(getCurrencyDecimals("JPY")).toBe(0);
    expect(getCurrencyDecimals("KRW")).toBe(0);
  });

  it("returns 3 for three-decimal currencies", () => {
    expect(getCurrencyDecimals("KWD")).toBe(3);
    expect(getCurrencyDecimals("BHD")).toBe(3);
  });
});

describe("toCents", () => {
  it("converts amounts to cents", () => {
    expect(toCents(10.5, "USD")).toBe(1050);
    expect(toCents(100, "JPY")).toBe(100);
    expect(toCents(1.234, "KWD")).toBe(1234);
  });
});

describe("fromCents", () => {
  it("converts cents to amounts", () => {
    expect(fromCents(1050, "USD")).toBe(10.5);
    expect(fromCents(100, "JPY")).toBe(100);
    expect(fromCents(1234, "KWD")).toBe(1.234);
  });
});
