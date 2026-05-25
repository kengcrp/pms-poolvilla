import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  // Transpile workspace packages — required for hot-reload of @pms/* TS sources
  transpilePackages: ['@pms/ui', '@pms/api', '@pms/auth', '@pms/db'],
  // Standalone output for Docker — copies only the files needed to run, no
  // node_modules. See Dockerfile.own for the deploy pipeline.
  output: 'standalone',
  // Tell Next.js the monorepo root so standalone tracing pulls in workspace
  // packages (api/auth/db/ui) from ../../packages instead of stopping at this
  // app's directory.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Image uploads stored as base64 MEDIUMTEXT can be large — allow generous
  // body size on server actions / route handlers.
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
}

export default nextConfig
