import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@pms/ui', '@pms/api', '@pms/auth', '@pms/db'],
}

export default nextConfig
