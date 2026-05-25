import { z } from 'zod'

// Property type — references PropertyTypeMaster.code (managed in Admin panel)
export const PropertyTypeEnum = z.string().min(1)
export const ReviewStatusEnum = z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED'])
export const PricingModeEnum = z.enum(['SHOW_SELL', 'SHOW_WHOLESALE', 'HIDE'])

export const localizedString = z.object({
  th: z.string().min(1, 'จำเป็นต้องระบุภาษาไทย'),
  en: z.string().optional(),
  zh: z.string().optional(),
})

export const propertyCreateSchema = z.object({
  name: localizedString,
  type: PropertyTypeEnum,
  totalBedrooms: z.number().int().min(0).max(50),
  totalBathrooms: z.number().int().min(0).max(50),
  areaSqwa: z.number().nonnegative().optional(),
  contactInfo: z.string().optional(),
  /** Show "ราคาส่ง Agent" rows in pricing / calendar — set during onboarding */
  partnerListing: z.boolean().optional(),
  // Initial default variant (full villa)
  defaultVariantName: z.string().min(1).optional(),
  defaultVariantMaxGuests: z.number().int().min(1).max(100),
})

export const propertyUpdateSchema = z.object({
  id: z.string(),
  name: localizedString.optional(),
  type: PropertyTypeEnum.optional(),
  totalBedrooms: z.number().int().min(0).max(50).optional(),
  totalBathrooms: z.number().int().min(0).max(50).optional(),
  areaSqwa: z.number().nonnegative().nullable().optional(),
  partnerListing: z.boolean().optional(),
  contactInfo: z.string().nullable().optional(),
  /** How far ahead (months) guests may book. null = use system default. */
  bookingWindowMonths: z.number().int().min(0).max(60).nullable().optional(),
  pricingMode: PricingModeEnum.optional(),
  reviewStatus: ReviewStatusEnum.optional(),
  isActive: z.boolean().optional(),
})

export const variantCreateSchema = z.object({
  propertyId: z.string(),
  name: localizedString,
  bedrooms: z.number().int().min(1).max(50),
  maxGuests: z.number().int().min(1).max(100),
  extraRoomPrice: z.number().nonnegative().optional(),
  roomSelectionMode: z.enum(['OWNER_ALLOCATES', 'GUEST_PICKS_AT_CHECKIN']).optional(),
})

export const variantUpdateSchema = z.object({
  id: z.string(),
  name: localizedString.optional(),
  bedrooms: z.number().int().min(1).max(50).optional(),
  maxGuests: z.number().int().min(1).max(100).optional(),
  extraRoomPrice: z.number().nonnegative().nullable().optional(),
  roomSelectionMode: z.enum(['OWNER_ALLOCATES', 'GUEST_PICKS_AT_CHECKIN']).nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>
export type VariantCreateInput = z.infer<typeof variantCreateSchema>
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>
