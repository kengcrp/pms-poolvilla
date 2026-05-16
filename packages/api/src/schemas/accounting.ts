import { z } from 'zod'

export const docTypeEnum = z.enum(['QUOTE', 'INVOICE', 'TAX_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'])
export const docStatusEnum = z.enum(['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'])

export const customerDataSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อ'),
  address: z.string().optional().default(''),
  taxId: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  branchNo: z.string().optional().default(''),
})

export const lineItemSchema = z.object({
  desc: z.string().min(1),
  qty: z.number().nonnegative(),
  price: z.number(),
})

export const docCreateSchema = z.object({
  type: docTypeEnum,
  customerData: customerDataSchema,
  items: z.array(lineItemSchema).min(1, 'ต้องมีรายการอย่างน้อย 1 รายการ'),
  withVat: z.boolean().default(false),
  notes: z.string().optional(),
})

export const docUpdateSchema = z.object({
  id: z.string(),
  customerData: customerDataSchema.optional(),
  items: z.array(lineItemSchema).optional(),
  withVat: z.boolean().optional(),
  notes: z.string().optional(),
})

export type DocCreateInput = z.infer<typeof docCreateSchema>
export type DocUpdateInput = z.infer<typeof docUpdateSchema>
export type CustomerData = z.infer<typeof customerDataSchema>
export type LineItem = z.infer<typeof lineItemSchema>
