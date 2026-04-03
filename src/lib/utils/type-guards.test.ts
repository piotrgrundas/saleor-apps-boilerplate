import { describe, expect, it } from "vite-plus/test";

import { isEmptyObject, isFunction, isObject } from "./type-guards";

describe("isObject", () => {
  it("returns true for plain objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  it("returns false for non-objects", () => {
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject([])).toBe(false);
    expect(isObject("string")).toBe(false);
    expect(isObject(42)).toBe(false);
  });
});

describe("isEmptyObject", () => {
  it("returns true for empty objects", () => {
    expect(isEmptyObject({})).toBe(true);
  });

  it("returns false for non-empty objects", () => {
    expect(isEmptyObject({ a: 1 })).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isEmptyObject(null)).toBe(false);
    expect(isEmptyObject([])).toBe(false);
  });
});

describe("isFunction", () => {
  it("returns true for functions", () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(function test() {})).toBe(true);
  });

  it("returns false for non-functions", () => {
    expect(isFunction(null)).toBe(false);
    expect(isFunction({})).toBe(false);
  });
});
