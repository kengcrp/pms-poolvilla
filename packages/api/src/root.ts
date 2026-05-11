import { router } from './trpc'
import { propertyRouter } from './routers/property'
import { variantRouter } from './routers/variant'
import { locationRouter } from './routers/location'

export const appRouter = router({
  property: propertyRouter,
  variant: variantRouter,
  location: locationRouter,
})

export type AppRouter = typeof appRouter
