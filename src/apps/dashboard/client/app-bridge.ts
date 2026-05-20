import { AppBridge, createAuthenticatedFetch } from "@saleor/app-sdk/app-bridge";

/**
 * Singleton AppBridge instance for the dashboard SPA. Same instance feeds
 * `AppBridgeProvider` (so React hooks observe state changes) and
 * `authenticatedFetch` (so outbound requests carry the live JWT + Saleor
 * API URL without callers wiring headers manually).
 */
export const appBridge = new AppBridge();

/**
 * Fetch wrapper that injects `authorization-bearer` and `saleor-api-url`
 * headers pulled from the AppBridge state on every call. Use as the
 * `fetch` option to `hc<AppType>(..., { fetch: authenticatedFetch })`.
 */
export const authenticatedFetch = createAuthenticatedFetch(appBridge);
