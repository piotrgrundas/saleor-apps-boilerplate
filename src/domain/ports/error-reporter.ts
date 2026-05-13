/**
 * Error reporting port (Sentry, Rollbar, Bugsnag, etc.).
 *
 * - `capture` is fire-and-forget; callers normally ignore the returned promise.
 * - `wrap` decorates a handler so the reporter can flush pending events before
 *   the runtime freezes (Lambda, Cloudflare Workers). Noop reporters return the
 *   handler unchanged.
 * - `setContext` attaches a named structured context blob to subsequent events
 *   on the current scope (per-request user/auth/feature info). Pass `null` to
 *   clear.
 *
 * Reporters that are unavailable at runtime should silently no-op.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => any;

export type ErrorReporter = {
  capture(err: unknown, extra?: Record<string, unknown>): Promise<void>;
  wrap<H extends AnyHandler>(handler: H): H;
  setContext(name: string, context: Record<string, unknown> | null): void;
};
