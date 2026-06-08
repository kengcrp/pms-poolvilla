/**
 * Centralised list of every sessionStorage key the "add listing" wizard uses
 * for client-side drafts. Whenever the owner kicks off a fresh add-property
 * flow (clicking "เพิ่มที่พัก") we wipe all of these so no leftover state
 * from a previous attempt bleeds into the new property.
 *
 * Keep this list in sync as new draft keys are introduced — the wizard pages
 * own the writes; this helper owns the cleanup.
 */

/** Static keys — one per wizard page that uses a fixed sessionStorage slot. */
const STATIC_KEYS = [
  // /new/name
  'pms.newListing.name',
  'pms.newListing.scraped',
  // /new/form — basic-info draft + the property id created at step 3
  'pms.newListing.formDraft',
  'pms.newListing.createdId',
  // [id]/policies — extra-guest pricing draft (รองรับสูงสุด / พักฟรี ...)
  'pms.newListing.guestPolicy',
  // [id]/amenities — pre-creation drafts
  'pms.newListing.amenities',
  'pms.newListing.pools',
  'pms.newListing.parking',
  'pms.newListing.petPolicy',
  'pms.newListing.recreation',
  'pms.newListing.kitchenEquipment',
  'pms.newListing.showerAmenities',
  // [id]/area
  'pms.newListing.locationAmenities',
  // /policies — sound policy
  'pms.newListing.soundPolicy',
]

/**
 * Wipe every wizard draft from sessionStorage. Also clears any per-variant
 * keys that match a known prefix (weeklyPricing seasons + plan2, etc.).
 * No-op when called outside the browser.
 */
export function clearWizardDrafts(): void {
  if (typeof window === 'undefined') return
  try {
    for (const key of STATIC_KEYS) {
      sessionStorage.removeItem(key)
    }
    // Sweep dynamic keys whose suffix is a variantId / propertyId.
    const PREFIXES = [
      'pms.weeklyPricing.seasons:',
      'pms.weeklyPricing.plan2:',
      'pms.weeklyPricing.period:',
      'pms.noPropertyPricing.dismissed:',
    ]
    const matches: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i)
      if (k && PREFIXES.some((p) => k.startsWith(p))) matches.push(k)
    }
    for (const k of matches) sessionStorage.removeItem(k)
  } catch {
    /* sessionStorage disabled / full — best-effort */
  }
}
