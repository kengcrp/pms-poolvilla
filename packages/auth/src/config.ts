import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma, type UserRole } from '@pms/db'

const credSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type AppRoleConstraint = UserRole[] | 'any'

/**
 * Build an Auth.js config with role gating.
 * Use `allowedRoles: ['OWNER']` in apps/own; `['STAFF', 'SUPER_ADMIN']` in apps/m.
 */
export function buildAuthConfig(opts: { allowedRoles: UserRole[] }): NextAuthConfig {
  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' },
    pages: { signIn: '/login' },
    providers: [
      Credentials({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(raw) {
          const parsed = credSchema.safeParse(raw)
          if (!parsed.success) return null
          const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
          if (!user || !user.passwordHash) return null
          if (user.suspendedAt) return null
          if (!opts.allowedRoles.includes(user.role)) return null
          const ok = await compare(parsed.data.password, user.passwordHash)
          if (!ok) return null
          return { id: user.id, email: user.email, name: user.name, role: user.role }
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.role = (user as { role: UserRole }).role
          token.userId = (user as { id: string }).id
        }
        return token
      },
      session({ session, token }) {
        if (session.user) {
          ;(session.user as { id?: string }).id = token.userId as string
          ;(session.user as { role?: UserRole }).role = token.role as UserRole
        }
        return session
      },
    },
  }
}
