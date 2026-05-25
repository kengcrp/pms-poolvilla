# syntax=docker/dockerfile:1.7

# Multi-stage build for any Next.js app in this monorepo.
# Pass APP_NAME=own or APP_NAME=m at build time:
#   docker build --build-arg APP_NAME=own -t pms-own .
#
# Output: minimal Node image running the standalone server on the app's port.

ARG NODE_VERSION=20-alpine

# ─── 1. base — pnpm corepack ──────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate

# ─── 2. deps — install all workspace deps (cached layer) ──────────────
FROM base AS deps
WORKDIR /repo
# Copy lockfile + workspace manifests for maximal cache hits
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/own/package.json apps/own/
COPY apps/m/package.json apps/m/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ─── 3. builder — full source + turbo build ───────────────────────────
FROM base AS builder
ARG APP_NAME
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/own/node_modules ./apps/own/node_modules
COPY --from=deps /repo/apps/m/node_modules ./apps/m/node_modules
COPY --from=deps /repo/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /repo/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=deps /repo/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /repo/packages/ui/node_modules ./packages/ui/node_modules
COPY . .

# Prisma client must be generated before Next.js build (server bundles use it)
RUN pnpm --filter @pms/db prisma generate

# Build the target app (and its workspace deps via turbo's ^build pipeline)
RUN pnpm --filter @pms/${APP_NAME} build

# ─── 4. runner — minimal standalone image ─────────────────────────────
FROM node:${NODE_VERSION} AS runner
ARG APP_NAME
ARG APP_PORT
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=${APP_PORT}
ENV HOSTNAME=0.0.0.0
# Persist APP_NAME so the CMD can resolve it at runtime (build args are not
# available after the build completes).
ENV APP_NAME=${APP_NAME}

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

# Standalone output — Next.js packages everything needed into a single tree
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

# Prisma engines + schema needed at runtime
COPY --from=builder --chown=nextjs:nodejs /repo/packages/db/prisma ./packages/db/prisma
COPY --from=builder --chown=nextjs:nodejs /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /repo/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE ${APP_PORT}
CMD ["sh", "-c", "node apps/${APP_NAME}/server.js"]
