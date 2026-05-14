// Bundle size analyzer using `vite-bundle-analyzer`. Builds every server
// entry and writes one HTML report per app to dist-analyze/.
//
// Usage:
//   vp run build:analyze
import path from "node:path";

import { analyzer } from "vite-bundle-analyzer";
import { build as viteBuild } from "vite-plus";

import { buildServerConfig, discoverEntryPoints } from "./build-utils";

const REPORT_DIR = path.resolve("dist-analyze");

const apps = discoverEntryPoints("entry-server.ts");
if (apps.length === 0) {
  console.error("No server entry points found.");
  process.exit(1);
}

console.log(`Analyzing ${apps.length} server app(s)...`);

for (const app of apps) {
  const config = buildServerConfig(app, { minify: true, nodeEnv: "production" });
  const reportPath = path.join(REPORT_DIR, `${app.name}.html`);

  await viteBuild({
    ...config,
    build: { ...config.build, outDir: path.join("/tmp/vp-analyze", app.name), emptyOutDir: true },
    plugins: [
      analyzer({
        analyzerMode: "static",
        fileName: reportPath,
        openAnalyzer: false,
      }),
    ],
  });

  console.log(`  ${app.name} → ${reportPath}`);
}

console.log(`\nOpen reports from ${REPORT_DIR}/`);
