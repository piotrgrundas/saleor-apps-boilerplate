import { describe, expect } from "vite-plus/test";

import type { Error as DomainErr } from "@/domain/errors/base";
import { it } from "@/lib/test/it";

import { DomainException, ValidationException } from "./base";

describe("DomainException", () => {
  it("serializes errors array with first code", () => {
    // given
    const errors: DomainErr[] = [
      {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { issues: [{ message: "invalid format", path: ["email"] }] },
      },
    ];

    // when
    const serialized = new DomainException(400, errors).serialize();

    // then
    expect(serialized).toEqual({
      error: "VALIDATION_ERROR",
      message: "Validation failed",
      statusCode: 400,
      code: "VALIDATION_ERROR",
      errors,
    });
  });

  it("serializes single-error JWKS failure", () => {
    // given
    const errors: DomainErr[] = [
      {
        code: "JWKS_FETCH_ERROR",
        message: "Failed to fetch JWKS",
      },
    ];

    // when
    const serialized = new DomainException(502, errors).serialize();

    // then
    expect(serialized.code).toBe("JWKS_FETCH_ERROR");
    expect(serialized.errors).toEqual(errors);
  });
});

describe("ValidationException", () => {
  it("maps to HTTP 400", () => {
    // given
    const errors: DomainErr[] = [
      {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: { issues: [{ message: "missing required fields", path: [] }] },
      },
    ];

    // when
    const exception = new ValidationException(errors);

    // then
    expect(exception.status).toBe(400);
    expect(exception.serialize()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid input",
      statusCode: 400,
      code: "VALIDATION_ERROR",
      errors,
    });
  });
});
