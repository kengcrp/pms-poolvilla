import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Transpile workspace packages — required for hot-reload of @pms/* TS sources
  transpilePackages: ['@pms/ui', '@pms/api', '@pms/auth', '@pms/db'],
}

export default nextConfig
