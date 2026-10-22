# syntax=docker/dockerfile:1
# Build a partir da RAIZ do monorepo: docker build -f apps/api/Dockerfile .
FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@11.17.0
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @quero-assistir/api...
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @quero-assistir/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Aplica migrations pendentes (Prisma usa advisory lock, seguro com várias réplicas) e sobe a API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
