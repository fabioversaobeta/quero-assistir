# syntax=docker/dockerfile:1
# Build a partir da RAIZ do monorepo: docker build -f apps/admin/Dockerfile .
FROM node:22-slim AS base
RUN npm install -g pnpm@11.17.0
WORKDIR /repo

FROM base AS build
# NEXT_PUBLIC_* é embutida no bundle em build time.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile --filter @quero-assistir/admin...
COPY packages/contracts packages/contracts
COPY apps/admin apps/admin
RUN pnpm --filter @quero-assistir/admin build

FROM node:22-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /repo/apps/admin/public ./apps/admin/public
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
