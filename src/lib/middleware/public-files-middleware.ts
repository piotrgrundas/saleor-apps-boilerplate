import { serveStatic } from "@hono/node-server/serve-static";

import { IS_PROD } from "@/constants";

/**
 * Serves files from the public/ directory.
 * Strips the app's basePath so `/handler/logo.png` resolves to `./public/logo.png`.
 */
export const createPublicFilesMiddleware = (basePath: string) =>
  serveStatic({
    root: IS_PROD ? "./" : "./public",
    rewriteRequestPath: (path) => (basePath ? path.replace(basePath, "") : path),
  });
