FROM node:22-alpine

WORKDIR /app

ENV NODE_PATH=/app/apps/orchestrator-api/node_modules:/app/node_modules

COPY .npmrc package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/orchestrator-api ./apps/orchestrator-api
# Prisma client is generated into web/src/generated — copy it so the orchestrator
# import path (../../../../web/src/generated/prisma-client) resolves inside the image
COPY web/src/generated/prisma-client ./web/src/generated/prisma-client

RUN corepack enable
RUN pnpm install --filter @rpa/orchestrator-api... --no-frozen-lockfile
RUN pnpm --filter @rpa/orchestrator-api build

CMD ["node", "apps/orchestrator-api/dist/index.js"]
