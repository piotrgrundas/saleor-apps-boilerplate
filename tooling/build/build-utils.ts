import fs from "node:fs";
import path from "node:path";

import react from "@vitejs/plugin-react";
import { build as viteBuild } from "vite-plus";

export const DIST_DIR = path.resolve("dist");
export const APPS_DIR = path.resolve("src/apps");

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

export async function buildServer(app: AppEntry, options: { minify: boolean; nodeEnv: string }) {
  const outDir = path.join(DIST_DIR, app.name);

  await viteBuild({
    ...SHARED,
    define: { "process.env.NODE_ENV": JSON.stringify(options.nodeEnv) },
    build: {
      outDir,
      emptyOutDir: false,
      ssr: app.entryPath,
      minify: options.minify,
      target: "node24",
      rollupOptions: {
        external: [...SERVER_EXTERNALS],
        output: { entryFileNames: "[name].js" },
      },
    },
    ssr: { target: "node", noExternal: true },
  });

  console.log(`  ${app.name} → ${outDir}`);
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
