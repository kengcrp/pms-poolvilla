import { z } from 'zod'

export const couponTypeEnum = z.enum(['DISCOUNT', 'CASH'])
export const couponFormatEnum = z.enum(['PERCENT', 'BAHT'])

export const couponCreateSchema = z.object({
  code: z
    .string()
    .min(2, 'รหัสต้องมีอย่างน้อย 2 ตัวอักษร')
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, 'ใช้ A-Z, 0-9, - และ _ เท่านั้น')
    .transform((s) => s.toUpperCase()),
  name: z.string().min(1, 'กรุณาระบุชื่อโปร'),
  type: couponTypeEnum,
  format: couponFormatEnum,
  value: z.number().positive(),
  qty: z.number().int().min(1),
  startsAt: z.string(),
  expiresAt: z.string(),
  perUser: z.boolean().default(false),
})

export const couponUpdateSchema = couponCreateSchema.partial().extend({
  id: z.string(),
})

export type CouponCreateInput = z.infer<typeof couponCreateSchema>
export type CouponUpdateInput = z.infer<typeof couponUpdateSchema>

/**
 * Pure calculator — given a coupon snapshot + base price, return discount amount.
 * If type=DISCOUNT format=PERCENT → base * value / 100 (capped at base)
 * If type=DISCOUNT format=BAHT → min(value, base)
 * If type=CASH format=BAHT → min(value, base) (treated like a voucher)
 * If type=CASH format=PERCENT → unused, fallback to base * value / 100
 */
export function calcCouponDiscount(opts: {
  type: 'DISCOUNT' | 'CASH'
  format: 'PERCENT' | 'BAHT'
  value: number
  basePrice: number
}): number {
  if (opts.basePrice <= 0) return 0
  let discount: number
  if (opts.format === 'PERCENT') {
    discount = (opts.basePrice * opts.value) / 100
  } else {
    discount = opts.value
  }
  return Math.min(Math.max(0, discount), opts.basePrice)
}
