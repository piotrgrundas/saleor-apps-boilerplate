import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

import type { Logger } from "@/domain/ports/logger";

export type LambdaSimulatorConfig = {
  concurrency: number;
  coldStartMs: number;
  warmTtlMs: number;
  queueTimeoutMs?: number;
};

export type LambdaSimulatorDeps = {
  name: string;
  config: LambdaSimulatorConfig;
  logger: Logger;
};

type Slot = {
  id: number;
  busy: boolean;
  warmUntil: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createLambdaSimulator = ({
  name,
  config,
  logger,
}: LambdaSimulatorDeps) => {
  const log = logger.withTag(`lambda-simulator:${name}`);

  const slots: Slot[] = Array.from({ length: config.concurrency }, (_, id) => ({
    id,
    busy: false,
    warmUntil: 0,
  }));

  const waiters: Array<{
    resolve: (slot: Slot) => void;
    reject: (err: Error) => void;
    timer?: ReturnType<typeof setTimeout>;
  }> = [];

  const acquire = (): Promise<Slot> => {
    const free = slots.find((slot) => !slot.busy);
    if (free) {
      free.busy = true;
      return Promise.resolve(free);
    }

    return new Promise<Slot>((resolve, reject) => {
      const waiter: (typeof waiters)[number] = { resolve, reject };
      waiters.push(waiter);

      if (config.queueTimeoutMs) {
        waiter.timer = setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) {
            waiters.splice(index, 1);
            reject(new Error("lambda-simulator: queue timeout"));
          }
        }, config.queueTimeoutMs);
      }
    });
  };

  const release = (slot: Slot) => {
    slot.warmUntil = Date.now() + config.warmTtlMs;
    const next = waiters.shift();
    if (next) {
      if (next.timer) clearTimeout(next.timer);
      next.resolve(slot);
      return;
    }
    slot.busy = false;
  };

  return createMiddleware(async (context: Context, next: Next) => {
    const method = context.req.method;
    const path = context.req.path;

    let slot: Slot;
    try {
      slot = await acquire();
    } catch {
      log.warn("queue timeout", {
        queueTimeoutMs: config.queueTimeoutMs,
        waiters: waiters.length,
      });
      return context.json(
        {
          error: "Too Many Requests",
          reason: "lambda-simulator queue timeout",
        },
        503,
      );
    }

    const cold = Date.now() > slot.warmUntil;

    context.header("x-lambda-app", name);
    context.header("x-lambda-slot", String(slot.id));
    if (cold) {
      context.header("x-lambda-cold-start", "true");
      context.header("x-lambda-cold-start-ms", String(config.coldStartMs));
      log.info("cold start", {
        slot: slot.id,
        coldStartMs: config.coldStartMs,
      });
      await sleep(config.coldStartMs);
    } else {
      log.debug("warm invocation", { method, path, slot: slot.id });
    }

    try {
      await next();
    } finally {
      release(slot);
    }
  });
};

export const DEFAULT_LAMBDA_SIMULATOR_CONFIG: LambdaSimulatorConfig = {
  concurrency: 10,
  coldStartMs: 500,
  warmTtlMs: 10_000,
  queueTimeoutMs: 30_000,
};
