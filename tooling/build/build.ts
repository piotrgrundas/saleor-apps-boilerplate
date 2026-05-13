// Production build script.
// 1. Cleans dist/
// 2. Builds each server entry into dist/{appName}/ (bundled, Lambda SDK external)
// 3. Builds each client entry into dist/{appName}/assets/
// 4. Copies public assets
// 5. Writes root package.json for ESM Lambda compatibility
import fs from "node:fs";
import path from "node:path";

import {
  DIST_DIR,
  buildClient,
  buildServer,
  discoverEntryPoints,
} from "./build-utils";

const PUBLIC_DIR = path.resolve("public");

function clean() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

function copyPublicAssets() {
  if (!fs.existsSync(PUBLIC_DIR)) return;
  for (const file of fs.readdirSync(PUBLIC_DIR)) {
    fs.copyFileSync(path.join(PUBLIC_DIR, file), path.join(DIST_DIR, file));
  }
  console.log("Public assets copied.");
}

const nodeEnv = process.env.NODE_ENV ?? "production";
const minify = nodeEnv === "production";

clean();

const servers = discoverEntryPoints("entry-server.ts");
if (servers.length === 0) {
  console.error("No server entry points found.");
  process.exit(1);
}

console.log(`Building ${servers.length} server app(s) [NODE_ENV=${nodeEnv}]...`);
for (const app of servers) await buildServer(app, { minify, nodeEnv });

const clients = discoverEntryPoints("entry-client.tsx");
if (clients.length > 0) {
  console.log(`Building ${clients.length} client app(s)...`);
  for (const app of clients) await buildClient(app, { minify, nodeEnv });
}

copyPublicAssets();
fs.writeFileSync(
  path.join(DIST_DIR, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

console.log("Build complete → dist/");
