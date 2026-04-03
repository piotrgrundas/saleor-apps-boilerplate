/**
 * Local development / preview server.
 * Uses @hono/node-server with Hono.
 * Run with: tsx watch src/serve.ts
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import dashboardApp from "./apps/dashboard/entry-server";
import handlerApp from "./apps/handler/entry-server";

const app = new Hono();
app.route("/", handlerApp);
app.route("/configuration", dashboardApp);

const port = Number(process.env.PORT ?? 8000);

console.log(`Server running at http://localhost:${port}`);

serve({ fetch: app.fetch, port });
