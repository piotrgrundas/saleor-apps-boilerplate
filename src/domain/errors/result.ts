import { err, ok, type Result, type ResultAsync } from "neverthrow";

import type { Error, ErrorCode } from "./base";

export type AsyncResult<T, Code extends ErrorCode = ErrorCode> = Promise<Result<T, Error<Code>[]>>;

export type OkType<T> = T extends Result<infer O, unknown> ? O : never;
export type ErrType<T> = T extends Result<unknown, infer E> ? E : never;

export type OkResult<T> = T extends (...args: never) => Promise<Result<infer Ok, unknown>>
  ? Ok
  : never;

export type ErrResult<T> = T extends (...args: never) => Promise<Result<unknown, infer Err>>
  ? Err
  : never;

export const remapErrors = <T, From extends ErrorCode, To extends ErrorCode>(
  result: Result<T, Error<From>[]>,
  shape: { code: To; message: string; details?: Record<string, unknown> },
): Result<T, Error<To>[]> => {
  if (result.isErr()) {
    return err([{ ...shape, details: { ...shape.details, cause: result.error } }]);
  }
  return ok(result.value);
};

export type { Result, ResultAsync };
