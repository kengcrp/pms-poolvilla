import { redirect } from 'next/navigation'

/**
 * /residential booking-type picker was removed per UX request — the route is
 * kept as a transparent redirect so any old bookmarks / back-button presses
 * still land users on the correct next step.
 */
export default function ResidentialRedirect() {
  redirect('/manage/listings/new/residential/listings?booking=whole_unit&type=POOL_VILLA')
}
