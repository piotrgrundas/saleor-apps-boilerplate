// Standalone client build (used by `pnpm run build:client`).
import { buildClient, discoverEntryPoints } from "./build-utils";

const apps = discoverEntryPoints("entry-client.tsx");
if (apps.length === 0) {
  console.log("No client entry points found.");
  process.exit(0);
}

const isProduction = process.env.NODE_ENV === "production";

console.log(`Building ${apps.length} client app(s)...`);
for (const app of apps) {
  await buildClient(app, {
    minify: isProduction,
    nodeEnv: process.env.NODE_ENV ?? "development",
  });
}

console.log("Client build complete.");
