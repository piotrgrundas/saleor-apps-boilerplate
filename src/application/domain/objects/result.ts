import type { Result } from "neverthrow";

import type { DomainError, DomainErrorCode } from "./error";

export type DomainResult<T, Code extends DomainErrorCode = DomainErrorCode> = Result<
  T,
  DomainError<Code>
>;

export type AsyncDomainResult<T, Code extends DomainErrorCode = DomainErrorCode> = Promise<
  Result<T, DomainError<Code>>
>;

export type OkType<T> = T extends Result<infer O, unknown> ? O : never;

export type ErrType<T> = T extends Result<unknown, infer E> ? E : never;

export type OkResult<T> = T extends (...args: unknown[]) => Promise<Result<infer Ok, unknown>>
  ? Ok
  : never;

export type ErrResult<T> = T extends (...args: unknown[]) => Promise<Result<unknown, infer Err>>
  ? Err
  : never;

export type { Result, ResultAsync } from "neverthrow";
