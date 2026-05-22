import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@pms/api'
import { auth } from '@/auth'
import type { UserRole } from '@pms/db'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      const session = await auth()
      const u = session?.user as { id?: string; role?: UserRole; email?: string } | undefined
      return {
        session: u?.id && u.role && u.email ? { userId: u.id, role: u.role, email: u.email } : null,
      }
    },
  })

export { handler as GET, handler as POST }
