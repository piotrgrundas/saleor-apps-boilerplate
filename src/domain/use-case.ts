import type { Context } from "./context";

/**
 * Use-case shape: single object input that always carries `ctx`.
 *
 *   - Void input: `useCase({ ctx })` — `TInput` defaults to `{}`.
 *   - With input: `useCase({ ctx, ...fields })`.
 *
 * Never `useCase(undefined, ctx)`.
 */
export type UseCase<TInput extends object = Record<string, never>, TOutput = unknown> = (
  input: TInput & { ctx: Context },
) => TOutput;
