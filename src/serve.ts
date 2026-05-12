/**
 * Local development / preview server.
 * Uses @hono/node-server with Hono.
 * Run with: tsx watch src/serve.ts
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createLogger } from "@/di/factories/logging";

const logger = createLogger({ level: "info" }).withTag("dev server");
const app = new Hono();

const appsDir = join(dirname(fileURLToPath(import.meta.url)), "apps");
const appNames = readdirSync(appsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

logger.info(
  `Discovered apps, available under: ${appNames.map((app) => `/${app}`).join(", ")} paths.`,
);

for (const name of appNames) {
  const entry = join(appsDir, name, "entry-server.ts");
  const mod = await import(pathToFileURL(entry).href);

  /**
   * Hono server app is exported under default export.
   */
  if (!mod.default) continue;

  app.route(`/${name}`, mod.default);
}

const port = Number(process.env.PORT ?? 8000);

logger.info(`Server running at http://localhost:${port}`);

serve({ fetch: app.fetch, port });
