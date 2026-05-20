import type { Context } from "hono";
import { html } from "hono/html";

/**
 * Serves the HTML shell for the React client SPA.
 * Each app's assets live under dist/{appName}/assets/.
 *
 * Dev mode:
 *   - `Cache-Control: no-store` on the HTML so the iframe always fetches
 *     fresh markup.
 *   - `?t=<timestamp>` cache-bust suffix on the JS bundle URL so each HTML
 *     response forces the browser to re-fetch the latest build.
 */
export function createClientEntryPoint(appName: string) {
  return (context: Context) => {
    const basePath = process.env.BASE_PATH ?? "";
    const isDev = process.env.NODE_ENV !== "production";
    const cacheBust = isDev ? `?t=${Date.now()}` : "";

    if (isDev) {
      context.header("Cache-Control", "no-store, must-revalidate");
    }

    return context.html(html`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Saleor App</title>
          <script>
            window.env = {
              BASE_PATH: "${basePath}",
              APP_NAME: "${process.env.npm_package_name ?? ""}",
              APP_VERSION: "${process.env.npm_package_version ?? ""}",
            };
          </script>
        </head>
        <body>
          <div id="root"></div>
          <script
            type="module"
            src="${basePath}/assets/${appName}/entry-client.js${cacheBust}"
          ></script>
        </body>
      </html>
    `);
  };
}
