import { router } from '../../trpc'
import { adminPropertyRouter } from './property'
import { adminUserRouter } from './user'
import { adminLocationRouter } from './location'
import { adminAmenityRouter } from './amenity'
import { adminPropertyTypeRouter } from './property-type'
import { adminSettingsRouter } from './settings'
import { adminServiceRouter } from './service'
import { adminReportRouter } from './report'
import { adminHotelTypeRouter } from './hotel-type'
import { adminHotelRouter } from './hotel'
import { adminRoomTypeRouter } from './room-type'
import { adminHotelBookingRouter } from './hotel-booking'

export const adminRouter = router({
  property: adminPropertyRouter,
  user: adminUserRouter,
  location: adminLocationRouter,
  amenity: adminAmenityRouter,
  propertyType: adminPropertyTypeRouter,
  settings: adminSettingsRouter,
  service: adminServiceRouter,
  report: adminReportRouter,
  // Hotel module
  hotelType: adminHotelTypeRouter,
  hotel: adminHotelRouter,
  roomType: adminRoomTypeRouter,
  hotelBooking: adminHotelBookingRouter,
})
