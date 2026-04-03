import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { requestId } from "hono/request-id";

import { initSentry, Sentry } from "@/application/infrastructure/logging/sentry/instrument";
import { container } from "@/di/container";
import { createClientEntryPoint } from "@/lib/client/mount";
import { createErrorHandler } from "@/lib/error/handler";
import { createAssetsMiddleware } from "@/lib/middleware/assets-middleware";
import { healthCheckMiddleware } from "@/lib/middleware/health-check-middleware";
import { createLoggingMiddleware } from "@/lib/middleware/logging-middleware";
import { publicFilesMiddleware } from "@/lib/middleware/public-files-middleware";
import { requestOriginMiddleware } from "@/lib/middleware/request-origin-middleware";
import { graphqlApp } from "./api/graphql";
import { saleorApi } from "./api/rest/saleor";
import { APP_CONFIG } from "./config";

// Initialize Sentry for error reporting
initSentry();

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
app.route("/api/saleor", saleorApi);
app.route("/graphql", graphqlApp);

// Client SPA entry point
app.get("/client/*", createClientEntryPoint("handler"));

export type AppType = typeof app;

// AWS Lambda handler
export const handler = Sentry.wrapHandler(handle(app));

// Default export for local development
export default app;
