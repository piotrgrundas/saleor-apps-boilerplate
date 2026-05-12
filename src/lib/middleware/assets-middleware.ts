import { serveStatic } from "@hono/node-server/serve-static";
import { createMiddleware } from "hono/factory";

/**
 * Serves static assets from each app's dist/{appName}/assets/ directory.
 * Rewrites URL path /assets/{appName}/file → /{appName}/assets/file on disk.
 */
export function createAssetsMiddleware(basePath: string) {
  const prefix = `${basePath}/assets/`;

  return createMiddleware(async (context, next) => {
    if (!context.req.path.startsWith(prefix)) {
      return next();
    }

    const relative = context.req.path.slice(prefix.length); // "{appName}/file.js"
    const slashIdx = relative.indexOf("/");
    if (slashIdx === -1) return next();

    const appName = relative.slice(0, slashIdx);
    const file = relative.slice(slashIdx + 1);
    const rewrittenPath = `/${appName}/assets/${file}`;

    return serveStatic({
      root: "./dist",
      rewriteRequestPath: () => rewrittenPath,
    })(context, next);
  });
}
