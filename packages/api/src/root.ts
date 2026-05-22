import { router } from './trpc'
import { propertyRouter } from './routers/property'
import { variantRouter } from './routers/variant'
import { locationRouter } from './routers/location'
import { pricingRouter } from './routers/pricing'
import { calendarRouter } from './routers/calendar'
import { bookingRouter } from './routers/booking'
import { propertyExtrasRouter } from './routers/property-extras'
import { publicRouter } from './routers/public'
import { accountingRouter } from './routers/accounting'
import { couponRouter } from './routers/coupon'
import { payoutRouter } from './routers/payout'
import { housekeepingRouter } from './routers/housekeeping'
import { penaltyItemRouter } from './routers/penalty-item'
import { adminRouter } from './routers/admin'
import { hotelRouter } from './routers/hotel'
import { roomTypeRouter } from './routers/room-type'
import { hotelBookingRouter } from './routers/hotel-booking'

export const appRouter = router({
  admin: adminRouter,
  hotel: hotelRouter,
  roomType: roomTypeRouter,
  hotelBooking: hotelBookingRouter,
  property: propertyRouter,
  variant: variantRouter,
  location: locationRouter,
  pricing: pricingRouter,
  calendar: calendarRouter,
  booking: bookingRouter,
  propertyExtras: propertyExtrasRouter,
  public: publicRouter,
  accounting: accountingRouter,
  coupon: couponRouter,
  payout: payoutRouter,
  housekeeping: housekeepingRouter,
  penaltyItem: penaltyItemRouter,
})

export type AppRouter = typeof appRouter
