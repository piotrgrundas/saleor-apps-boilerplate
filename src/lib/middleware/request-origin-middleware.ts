import { createMiddleware } from "hono/factory";

/**
 * Reconstructs the request origin from forwarded headers.
 * Critical for apps running behind ALB/API Gateway/reverse proxies.
 *
 * Sets:
 *   - `origin`  — protocol+host only
 *   - `baseUrl` — origin + app's basePath (mount point)
 */
export const createRequestOriginMiddleware = ({ basePath }: { basePath: string }) =>
  createMiddleware(async (context, next) => {
    const proto = context.req.header("x-forwarded-proto") ?? "https";
    const host = context.req.header("host") ?? "localhost";
    const origin = `${proto}://${host}`;

    context.set("origin", origin);
    context.set("baseUrl", `${origin}${basePath}`);

    await next();
  });
