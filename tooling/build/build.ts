// Production build script.
// 1. Cleans dist/
// 2. Builds each server entry into dist/{appName}/ (bundled, Lambda SDK external)
// 3. Builds each client entry into dist/{appName}/assets/
// 4. Copies public assets
// 5. Writes root package.json for ESM Lambda compatibility
import {
  buildClient,
  buildServer,
  clean,
  copyPublicAssets,
  discoverEntryPoints,
  writeRootPackageJson,
} from "./build-utils";

const nodeEnv = process.env.NODE_ENV ?? "production";
const minify = nodeEnv === "production";

clean();

const servers = discoverEntryPoints("entry-server.ts");

if (servers.length === 0) {
  console.error("No server entry points found.");
  process.exit(1);
}

console.log(`Building ${servers.length} server app(s) [NODE_ENV=${nodeEnv}]...`);

for (const app of servers) {
  await buildServer(app, { minify, nodeEnv });
}

const clients = discoverEntryPoints("entry-client.tsx");

if (clients.length > 0) {
  console.log(`Building ${clients.length} client app(s)...`);

  for (const app of clients) {
    await buildClient(app, { minify, nodeEnv });
  }
}

copyPublicAssets();
writeRootPackageJson();

console.log("Build complete → dist/");
