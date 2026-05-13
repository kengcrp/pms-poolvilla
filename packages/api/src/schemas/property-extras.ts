import { z } from 'zod'

export const propertyLocationSchema = z.object({
  propertyId: z.string(),
  locationId: z.string(),
  zoneId: z.string().nullable().optional(),
  province: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  gmapUrl: z.string().url().nullable().optional(),
  address: z.string().min(1),
  distanceTargetType: z.enum(['SEA', 'WATERFALL']).nullable().optional(),
  distanceValue: z.number().nonnegative().nullable().optional(),
  distanceUnit: z.enum(['METER', 'KILOMETER']).nullable().optional(),
})

export const propertyPolicySchema = z.object({
  propertyId: z.string(),
  checkinStart: z.string().regex(/^\d{2}:\d{2}$/),
  checkinEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  checkout: z.string().regex(/^\d{2}:\d{2}$/),
  deposit: z.number().nonnegative(),
  cancellationPolicyTh: z.string().default(''),
  postponePolicyTh: z.string().default(''),
  houseRulesTh: z.string().default(''),
  maxGuests: z.number().int().min(1),
  extraAdultPrice: z.number().nonnegative(),
  freeChildAgeUnder7: z.number().int().min(0).max(50),
  extraChildPrice: z.number().nonnegative(),
  freeInfantAgeUnder2: z.number().int().min(0).max(50),
  maxPets: z.number().int().min(0),
  extraPetPrice: z.number().nonnegative(),
})

export const propertyIcalSchema = z.object({
  propertyId: z.string(),
  platform: z.enum(['AGODA', 'BOOKING', 'AIRBNB', 'TRIP', 'EXPEDIA']),
  icalUrl: z.string().url().or(z.literal('')),
})

export const propertyPoolSchema = z.object({
  propertyId: z.string(),
  ownership: z.enum(['PRIVATE', 'SHARED']),
  system: z.enum(['SALT', 'CHLORINE', 'SALT_WARM', 'CHLORINE_WARM', 'FRESH_WARM']),
  widthM: z.number().nonnegative().nullable().optional(),
  lengthM: z.number().nonnegative().nullable().optional(),
  depthM: z.number().nonnegative().nullable().optional(),
  features: z.array(z.string()).default([]),
})

export type PropertyLocationInput = z.infer<typeof propertyLocationSchema>
export type PropertyPolicyInput = z.infer<typeof propertyPolicySchema>
export type PropertyIcalInput = z.infer<typeof propertyIcalSchema>
export type PropertyPoolInput = z.infer<typeof propertyPoolSchema>
