FROM node:22-alpine

WORKDIR /app

COPY pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/orchestrator-api ./apps/orchestrator-api

RUN corepack enable
RUN pnpm install --filter @rpa/orchestrator-api... --no-frozen-lockfile
RUN pnpm --filter @rpa/orchestrator-api build

CMD ["node", "apps/orchestrator-api/dist/index.js"]

