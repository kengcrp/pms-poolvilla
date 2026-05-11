import { router } from './trpc'
import { propertyRouter } from './routers/property'
import { variantRouter } from './routers/variant'
import { locationRouter } from './routers/location'
import { pricingRouter } from './routers/pricing'
import { calendarRouter } from './routers/calendar'
import { bookingRouter } from './routers/booking'

export const appRouter = router({
  property: propertyRouter,
  variant: variantRouter,
  location: locationRouter,
  pricing: pricingRouter,
  calendar: calendarRouter,
  booking: bookingRouter,
})

export type AppRouter = typeof appRouter
