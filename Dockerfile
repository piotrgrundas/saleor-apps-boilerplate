FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Development
FROM base AS development
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# Build
FROM base AS build
RUN pnpm run build

# Production
FROM node:22-slim AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/handler/entry-server.js"]
