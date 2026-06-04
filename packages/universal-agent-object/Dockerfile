# ============================================================
# NextGen Bot Runner — Docker Image
# ============================================================
# Multi-stage build:
#   Stage 1 (builder): bundles TypeScript + all deps via tsup
#   Stage 2 (runner):  minimal image — ONLY the bundled .js file,
#                      no node_modules required at runtime
#
# Build:
#   docker build -t nextgen/bot-runner:latest .
#
# Run:
#   docker run \
#     -e NEXTGEN_TENANT_ID=<uuid> \
#     -e NEXTGEN_ORCHESTRATOR_URL=https://portal.example.com \
#     -e NEXTGEN_ACTIVATION_TOKEN=<token> \
#     nextgen/bot-runner:latest
# ============================================================

# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests first (better layer caching)
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy only the universal-agent-object package sources
COPY packages/universal-agent-object/package.json     ./packages/universal-agent-object/
COPY packages/universal-agent-object/tsconfig.json    ./packages/universal-agent-object/
COPY packages/universal-agent-object/tsup.config.ts   ./packages/universal-agent-object/
COPY packages/universal-agent-object/src/             ./packages/universal-agent-object/src/

# Install ALL dependencies including devDeps (needed for tsup/esbuild)
RUN pnpm install --frozen-lockfile --filter @nextgen/universal-agent-object...

# Bundle — tsup inlines all runtime deps (zod, uuid, eventemitter3)
# into a single self-contained dist/bootstrap/container.js
RUN pnpm --filter @nextgen/universal-agent-object build


# ── Stage 2: Production Runner ───────────────────────────────
FROM node:20-alpine AS runner

# Install Chromium for headless web automation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Playwright / Puppeteer where Chromium is
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create a non-root user for security
RUN addgroup -S nextgen && adduser -S nextgen -G nextgen

WORKDIR /app

# ── Copy ONLY the bundled output (no node_modules!) ──────────
# tsup has already inlined all deps into this single file.
# The only runtime dependency is Node.js itself (provided by the base image).
COPY --from=builder /app/packages/universal-agent-object/dist ./dist

USER nextgen

# The container bootstrap is fully self-contained
CMD ["node", "dist/bootstrap/container.js"]

# ── Labels ───────────────────────────────────────────────────
LABEL org.opencontainers.image.title="NextGen Bot Runner"
LABEL org.opencontainers.image.description="Universal Automation Capture & Execution Layer — containerised runner (self-contained, no node_modules)"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="NextGen Platform"

