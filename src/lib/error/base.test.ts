import { describe, expect, it } from "vite-plus/test";

import type { DomainError } from "@/application/domain/objects/error";
import { DomainException, ValidationException } from "./base";

describe("DomainException", () => {
  it("serializes context as details when present", () => {
    // given
    const domainError: DomainError<"VALIDATION_ERROR"> = {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      context: { issues: [{ message: "invalid format", path: ["email"] }] },
    };

    // when
    const serialized = new DomainException(400, domainError).serialize();

    // then
    expect(serialized).toEqual({
      error: "VALIDATION_ERROR",
      message: "Validation failed",
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: { issues: [{ message: "invalid format", path: ["email"] }] },
    });
  });

  it("omits details when context is undefined", () => {
    // given
    const domainError: DomainError<"JWKS_FETCH_ERROR"> = {
      code: "JWKS_FETCH_ERROR",
      message: "Failed to fetch JWKS",
    };

    // when
    const serialized = new DomainException(502, domainError).serialize();

    // then
    expect(serialized.details).toBeUndefined();
  });
});

describe("ValidationException", () => {
  it("maps to HTTP 400", () => {
    // given
    const domainError: DomainError<"VALIDATION_ERROR"> = {
      code: "VALIDATION_ERROR",
      message: "Invalid input",
      context: { issues: [{ message: "missing required fields", path: [] }] },
    };

    // when
    const exception = new ValidationException(domainError);

    // then
    expect(exception.status).toBe(400);
    expect(exception.serialize()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid input",
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: { issues: [{ message: "missing required fields", path: [] }] },
    });
  });
});
