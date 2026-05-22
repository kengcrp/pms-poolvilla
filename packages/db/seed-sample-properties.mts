/**
 * Seed sample properties for the demo owner — recreates a realistic test dataset
 * after a fresh `prisma db push`. Idempotent: skips properties whose code already exists.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SampleVariant {
  name: string
  bedrooms: number
  maxGuests: number
  isDefault?: boolean
  weeklyPrice: number // applied to all 7 dow rows
}

interface SampleProperty {
  code: string
  nameTh: string
  type: string // matches PropertyTypeMaster.code
  totalBedrooms: number
  totalBathrooms: number
  variants: SampleVariant[]
}

const SAMPLES: SampleProperty[] = [
  {
    code: 'TN-001',
    nameTh: 'TN 001 — Big Villa',
    type: 'POOL_VILLA',
    totalBedrooms: 10,
    totalBathrooms: 8,
    variants: [
      { name: 'เหมาหลัง', bedrooms: 10, maxGuests: 20, isDefault: true, weeklyPrice: 20000 },
      { name: 'แบ่ง 2 ห้องนอน', bedrooms: 2, maxGuests: 4, weeklyPrice: 5000 },
      { name: 'แบ่ง 4 ห้องนอน', bedrooms: 4, maxGuests: 8, weeklyPrice: 9000 },
      { name: 'แบ่ง 6 ห้องนอน', bedrooms: 6, maxGuests: 12, weeklyPrice: 13000 },
    ],
  },
  {
    code: 'TN-002',
    nameTh: 'TN 002 — Midsize Pool',
    type: 'POOL_VILLA',
    totalBedrooms: 4,
    totalBathrooms: 3,
    variants: [
      { name: 'เหมาหลัง', bedrooms: 4, maxGuests: 8, isDefault: true, weeklyPrice: 6000 },
    ],
  },
  {
    code: 'TN-003',
    nameTh: 'TN 003 — Family Villa',
    type: 'POOL_VILLA',
    totalBedrooms: 10,
    totalBathrooms: 7,
    variants: [
      { name: 'เหมาหลัง', bedrooms: 10, maxGuests: 20, isDefault: true, weeklyPrice: 10000 },
      { name: 'แบ่ง 2 ห้องนอน', bedrooms: 2, maxGuests: 4, weeklyPrice: 2500 },
      { name: 'แบ่ง 4 ห้องนอน', bedrooms: 4, maxGuests: 8, weeklyPrice: 4500 },
    ],
  },
  {
    code: 'TN-004',
    nameTh: 'TN 004 — Loft Suite',
    type: 'LOFT',
    totalBedrooms: 2,
    totalBathrooms: 2,
    variants: [
      { name: 'เหมาหลัง', bedrooms: 2, maxGuests: 4, isDefault: true, weeklyPrice: 3500 },
    ],
  },
  {
    code: 'TN-005',
    nameTh: 'TN 005 — B&B House',
    type: 'BNB',
    totalBedrooms: 3,
    totalBathrooms: 2,
    variants: [
      { name: 'เหมาหลัง', bedrooms: 3, maxGuests: 6, isDefault: true, weeklyPrice: 4200 },
    ],
  },
]

async function main() {
  const owner = await prisma.user.findUnique({ where: { email: 'owner@pms.local' } })
  if (!owner) {
    throw new Error('Demo owner not found — run `prisma/seed.ts` first.')
  }

  let createdCount = 0
  let skippedCount = 0

  for (const sample of SAMPLES) {
    const existing = await prisma.property.findUnique({ where: { code: sample.code } })
    if (existing) {
      console.log(`⏭  ${sample.code} already exists, skipping`)
      skippedCount++
      continue
    }

    await prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          code: sample.code,
          ownerId: owner.id,
          name: { th: sample.nameTh },
          type: sample.type,
          totalBedrooms: sample.totalBedrooms,
          totalBathrooms: sample.totalBathrooms,
          reviewStatus: 'ACTIVE',
          isActive: true,
        },
      })

      for (let idx = 0; idx < sample.variants.length; idx++) {
        const v = sample.variants[idx]!
        const variant = await tx.propertyVariant.create({
          data: {
            propertyId: property.id,
            name: { th: v.name },
            bedrooms: v.bedrooms,
            maxGuests: v.maxGuests,
            isDefault: !!v.isDefault,
            sortOrder: idx,
          },
        })
        // Seed 7 weekly pricing rows (Sun..Sat) with the same price
        for (let dow = 0; dow < 7; dow++) {
          await tx.variantWeeklyPricing.create({
            data: {
              variantId: variant.id,
              dayOfWeek: dow,
              price: v.weeklyPrice,
              minStay: 1,
            },
          })
        }
      }
    })

    console.log(`✅ ${sample.code} — "${sample.nameTh}" (${sample.variants.length} variants)`)
    createdCount++
  }

  console.log(`\n📦 Seed complete: ${createdCount} created, ${skippedCount} skipped`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
