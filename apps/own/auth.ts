import NextAuth from 'next-auth'
import { buildAuthConfig } from '@pms/auth'

export const { handlers, auth, signIn, signOut } = NextAuth(buildAuthConfig({ allowedRoles: ['OWNER'] }))
