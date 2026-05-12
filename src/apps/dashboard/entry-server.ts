import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { requestId } from "hono/request-id";

import { container } from "@/apps/dashboard/di/container";
import { createClientEntryPoint } from "@/lib/client/mount";
import { createErrorHandler } from "@/lib/error/handler";
import { createAssetsMiddleware } from "@/lib/middleware/assets-middleware";
import { healthCheckMiddleware } from "@/lib/middleware/health-check-middleware";
import { createLoggingMiddleware } from "@/lib/middleware/logging-middleware";
import { publicFilesMiddleware } from "@/lib/middleware/public-files-middleware";
import { requestOriginMiddleware } from "@/lib/middleware/request-origin-middleware";
import { configurationRoutes } from "./api/rest/configuration/routes";
import { APP_CONFIG } from "./config";

const basePath = APP_CONFIG.BASE_PATH;

const logger = container.get("logger");

const app = new Hono().basePath(basePath);

// Error handler
app.onError(createErrorHandler(logger));

// Middleware stack
app.use("*", requestId());
app.use("*", createLoggingMiddleware(logger, { service: APP_CONFIG.SERVICE }));
app.use("*", createAssetsMiddleware(basePath));
app.use("*", publicFilesMiddleware);
app.use("*", requestOriginMiddleware);
app.use("*", healthCheckMiddleware);

// API routes
app.route("/api/configuration", configurationRoutes);

// Client SPA entry point
app.get("/client/*", createClientEntryPoint("dashboard"));

export type AppType = typeof app;

// AWS Lambda handler
export const handler = handle(app);

// Default export for local development
export default app;
