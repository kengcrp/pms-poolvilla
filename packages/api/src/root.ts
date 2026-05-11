import { router } from './trpc'
import { propertyRouter } from './routers/property'

export const appRouter = router({
  property: propertyRouter,
})

export type AppRouter = typeof appRouter
