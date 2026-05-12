import { createMiddleware } from "hono/factory";

export const healthCheckMiddleware = createMiddleware(async (context, next) => {
  if (context.req.path === "/healthcheck" && context.req.method === "GET") {
    return context.json({ status: "ok" });
  }
  await next();
});
