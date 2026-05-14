import fs from "node:fs";
import path from "node:path";

import react from "@vitejs/plugin-react";
import { build as viteBuild } from "vite-plus";

export const DIST_DIR = path.resolve("dist");
export const APPS_DIR = path.resolve("src/apps");
export const PUBLIC_DIR = path.resolve("public");

export function clean() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

export function copyPublicAssets() {
  if (!fs.existsSync(PUBLIC_DIR)) return;
  for (const file of fs.readdirSync(PUBLIC_DIR)) {
    fs.copyFileSync(path.join(PUBLIC_DIR, file), path.join(DIST_DIR, file));
  }
  console.log("Public assets copied.");
}

export function writeRootPackageJson() {
  fs.writeFileSync(
    path.join(DIST_DIR, "package.json"),
    JSON.stringify({ type: "module" }, null, 2),
  );
}

/**
 * Lambda runtime provides these — keep external, never bundle.
 * Everything else gets bundled into the server output.
 */
export const SERVER_EXTERNALS = [/^@aws-sdk\//] as const;

export type AppEntry = { name: string; entryPath: string };

export function discoverEntryPoints(filename: string): AppEntry[] {
  if (!fs.existsSync(APPS_DIR)) return [];
  return fs
    .readdirSync(APPS_DIR)
    .map((dir) => ({ name: dir, entryPath: path.join(APPS_DIR, dir, filename) }))
    .filter((e) => fs.existsSync(e.entryPath));
}

const SHARED = {
  configFile: false as const,
  root: process.cwd(),
  resolve: {
    alias: [
      { find: "@/constants", replacement: path.resolve("constants.ts") },
      { find: /^@\//, replacement: path.resolve("src") + "/" },
    ],
  },
  logLevel: "warn" as const,
};

export type ServerBuildOptions = { minify: boolean; nodeEnv: string };

export const buildServerConfig = (app: AppEntry, options: ServerBuildOptions) => ({
  ...SHARED,
  define: { "process.env.NODE_ENV": JSON.stringify(options.nodeEnv) },
  build: {
    outDir: path.join(DIST_DIR, app.name),
    emptyOutDir: false,
    ssr: app.entryPath,
    minify: options.minify,
    target: "node24",
    rollupOptions: {
      external: [...SERVER_EXTERNALS],
      output: { entryFileNames: "[name].js" },
    },
  },
  ssr: { target: "node" as const, noExternal: true },
});

export async function buildServer(app: AppEntry, options: ServerBuildOptions) {
  await viteBuild(buildServerConfig(app, options));
  console.log(`  ${app.name} → ${path.join(DIST_DIR, app.name)}`);
}

export async function buildClient(app: AppEntry, options: { minify: boolean; nodeEnv: string }) {
  const outDir = path.join(DIST_DIR, app.name, "assets");

  await viteBuild({
    ...SHARED,
    plugins: [react() as any],
    define: { "process.env.NODE_ENV": JSON.stringify(options.nodeEnv) },
    build: {
      outDir,
      emptyOutDir: true,
      minify: options.minify ? "esbuild" : false,
      cssCodeSplit: false,
      rollupOptions: {
        input: app.entryPath,
        output: {
          entryFileNames: "entry-client.js",
          assetFileNames: "entry-client[extname]",
        },
      },
    },
  });

  console.log(`  ${app.name} → ${outDir}`);
}
