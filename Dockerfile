# syntax=docker/dockerfile:1.7

# Simpler single-stage build for the monorepo. Pass APP_NAME=own or APP_NAME=m
# at build time:
#   docker build --build-arg APP_NAME=own --build-arg APP_PORT=3001 -t pms-own .
#
# Trades smaller image size for reliability with pnpm workspaces + Prisma. The
# final image keeps the full repo + node_modules so prisma CLI and the Next.js
# server both work without any path acrobatics.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate

FROM base AS runtime
ARG APP_NAME
ARG APP_PORT
WORKDIR /repo

# Lockfile + manifests first for max cache efficiency
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/own/package.json apps/own/
COPY apps/m/package.json apps/m/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Full source
COPY . .

# Prisma client → packages/db/node_modules/.prisma/client
# Dummy DATABASE_URL just to satisfy prisma's env validation at generate time
# (no actual connection is made — real URL is injected at runtime via .env).
RUN DATABASE_URL='mysql://build:build@localhost:3306/build' \
    pnpm --filter @pms/db exec prisma generate

# Build target app + its workspace deps (turbo's ^build pipeline)
# Next.js may also read env vars during build — keep the dummy here for safety.
RUN DATABASE_URL='mysql://build:build@localhost:3306/build' \
    AUTH_SECRET='dummy-build-time-secret-not-used-at-runtime-32c' \
    pnpm --filter @pms/${APP_NAME} run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=${APP_PORT}
ENV HOSTNAME=0.0.0.0
ENV APP_NAME=${APP_NAME}

EXPOSE ${APP_PORT}

# pnpm filter resolves at runtime so the CMD can use ENV vars
CMD ["sh", "-c", "pnpm --filter @pms/${APP_NAME} start"]
