#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
bun install --frozen-lockfile

echo "Building..."
bun run build

echo "Creating deployment artifact..."
cd dist
zip -r -D ../artifact.zip .
cd ..

echo "Build complete: artifact.zip"
