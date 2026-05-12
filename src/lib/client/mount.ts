import type { Context } from "hono";
import { html } from "hono/html";

/**
 * Serves the HTML shell for the React client SPA.
 * Each app's assets live under dist/assets/{appName}/.
 */
export function createClientEntryPoint(appName: string) {
  return (context: Context) => {
    const basePath = process.env.BASE_PATH ?? "";

    return context.html(html`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Saleor App</title>
          <link rel="stylesheet" href="${basePath}/assets/${appName}/entry-client.css" />
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
          <script type="module" src="${basePath}/assets/${appName}/entry-client.js"></script>
        </body>
      </html>
    `);
  };
}
