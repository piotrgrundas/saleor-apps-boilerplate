// Production build script.
// 1. Cleans dist/
// 2. Builds each server entry into dist/{appName}/
// 3. Builds each client entry into dist/{appName}/assets/
// 4. Installs external dependencies into each app
// 5. Copies public assets
// 6. Generates package.json for ESM Lambda compatibility
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { build as tsdownBuild } from "tsdown";

import {
  type AppEntry,
  DIST_DIR,
  SERVER_EXTERNALS,
  buildClient,
  discoverEntryPoints,
} from "./build-utils";

const PUBLIC_DIR = path.resolve("public");
const ROOT_PKG = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf-8"));

function clean() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

async function buildServer(app: AppEntry) {
  const outdir = path.join(DIST_DIR, app.name);
  fs.mkdirSync(outdir, { recursive: true });

  await tsdownBuild({
    entry: [app.entryPath],
    outDir: outdir,
    format: "esm",
    target: "node22",
    platform: "node",
    minify: true,
    external: SERVER_EXTERNALS.map((e) => e.name),
    clean: false,
    dts: false,
    alias: {
      "@": path.resolve("src"),
    },
  });

  console.log(`  ${app.name} → ${outdir}`);
}

function installExternals(app: AppEntry) {
  const appDir = path.join(DIST_DIR, app.name);
  const depsToInstall = SERVER_EXTERNALS.filter((e) => e.reason === "install");

  if (depsToInstall.length === 0) return;

  const dependencies: Record<string, string> = {};
  for (const dep of depsToInstall) {
    const version = ROOT_PKG.dependencies?.[dep.name];
    if (!version) {
      console.error(`External "${dep.name}" not found in root package.json dependencies.`);
      process.exit(1);
    }
    dependencies[dep.name] = version;
  }

  fs.writeFileSync(
    path.join(appDir, "package.json"),
    JSON.stringify({ type: "module", dependencies }, null, 2),
  );

  execFileSync("pnpm", ["install", "--prod"], {
    cwd: appDir,
    stdio: ["inherit", "inherit", "inherit"],
  });

  console.log(`  ${app.name} → ${depsToInstall.map((d) => d.name).join(", ")}`);
}

function copyPublicAssets() {
  if (!fs.existsSync(PUBLIC_DIR)) return;

  for (const file of fs.readdirSync(PUBLIC_DIR)) {
    fs.copyFileSync(path.join(PUBLIC_DIR, file), path.join(DIST_DIR, file));
  }
  console.log("Public assets copied.");
}

function generateRootPackageJson() {
  fs.writeFileSync(
    path.join(DIST_DIR, "package.json"),
    JSON.stringify({ type: "module" }, null, 2),
  );
}

// --- Run ---

clean();

const serverApps = discoverEntryPoints("entry-server.ts");
if (serverApps.length === 0) {
  console.error("No server entry points found.");
  process.exit(1);
}

console.log(`Building ${serverApps.length} server app(s)...`);

for (const app of serverApps) {
  await buildServer(app);
}

const clientApps = discoverEntryPoints("entry-client.tsx");

if (clientApps.length > 0) {
  console.log(`Building ${clientApps.length} client app(s)...`);

  for (const app of clientApps) {
    await buildClient(app, { minify: true, nodeEnv: "production" });
  }
}

console.log("Installing external dependencies...");

for (const app of serverApps) {
  installExternals(app);
}

copyPublicAssets();
generateRootPackageJson();

console.log("Build complete → dist/");
