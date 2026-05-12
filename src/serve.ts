/**
 * Local development / preview server.
 * Auto-discovers src/apps/<APP>/entry-server.ts and mounts each at /apps/<APP>.
 * All apps share one port. Each app wrapped with own lambda simulator
 * (cold/warm start + concurrency, isolated state per app).
 *
 * Env overrides:
 *   PORT                   Server port (default 3000)
 *   LAMBDA_COLD_START_MS   Cold start delay
 *   LAMBDA_CONCURRENCY     Concurrent slots per app
 *   LAMBDA_WARM_TTL_MS     Idle ms before slot goes cold
 *
 * Run with: tsx watch src/serve.ts
 */
import { serve } from "@hono/node-server";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";

import {
  createLambdaSimulator,
  DEFAULT_LAMBDA_SIMULATOR_CONFIG,
  type LambdaSimulatorConfig,
} from "./lib/dev/lambda-simulator";
import { createLogger } from "@/di/factories/logging";

const APPS_DIR = resolve(fileURLToPath(import.meta.url), "..", "apps");
const PORT = Number(process.env.PORT ?? 3000);

const simulatorConfig: LambdaSimulatorConfig = {
  ...DEFAULT_LAMBDA_SIMULATOR_CONFIG,
  concurrency: Number(
    process.env.LAMBDA_CONCURRENCY ??
      DEFAULT_LAMBDA_SIMULATOR_CONFIG.concurrency,
  ),
  coldStartMs: Number(
    process.env.LAMBDA_COLD_START_MS ??
      DEFAULT_LAMBDA_SIMULATOR_CONFIG.coldStartMs,
  ),
  warmTtlMs: Number(
    process.env.LAMBDA_WARM_TTL_MS ?? DEFAULT_LAMBDA_SIMULATOR_CONFIG.warmTtlMs,
  ),
};

const appNames = readdirSync(APPS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const gateway = new Hono();

const logger = createLogger({ level: "debug" });

for (const name of appNames) {
  const [entry, di] = await Promise.all([
    import(`./apps/${name}/entry-server.ts`),
    import(`./apps/${name}/di/container.ts`),
  ]);
  const inner = entry.default as Hono;
  // const logger = di.container.get("logger");

  const wrapped = new Hono();
  wrapped.use(
    "*",
    createLambdaSimulator({ name, config: simulatorConfig, logger }),
  );
  wrapped.route("/", inner);

  gateway.route(`/${name}`, wrapped);
}

serve({ fetch: gateway.fetch, port: PORT });

console.log(
  `Server  http://localhost:${PORT}  cold=${simulatorConfig.coldStartMs}ms conc=${simulatorConfig.concurrency} warmTtl=${simulatorConfig.warmTtlMs}ms`,
);
for (const name of appNames) {
  console.log(`  [${name}]  http://localhost:${PORT}/apps/${name}`);
}
