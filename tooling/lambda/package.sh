#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building..."
pnpm run build

echo "Creating deployment artifact..."
cd dist
zip -r -D ../artifact.zip .
cd ..

echo "Build complete: artifact.zip"
