import { PrismaClient, UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Locations master (from Runblook)
  const locations = [
    { name: 'บางแสน', province: 'ชลบุรี', zones: ['หาดบางแสน', 'หาดวอนนภา', 'อ่างศิลา', 'เขาสามมุข'] },
    { name: 'พัทยา', province: 'ชลบุรี', zones: ['เหนือ', 'ใต้'] },
    { name: 'หัวหิน', province: 'ประจวบคีรีขันธ์', zones: ['เขาตะเกียบ', 'เขาเต่า'] },
    { name: 'เขาใหญ่', province: 'นครราชสีมา', zones: ['ปากช่อง', 'วังน้ำเขียว', 'ถนนธนะรัชต์'] },
  ]

  // Property types (master data — editable from Admin panel)
  const propertyTypes = [
    { code: 'POOL_VILLA', nameTh: 'พูลวิลล่า', nameEn: 'Pool Villa', desc: 'บ้านพักพร้อมสระว่ายน้ำ', iconRef: 'swimmer', sortOrder: 0 },
    { code: 'LOFT', nameTh: 'ลอฟ', nameEn: 'Loft', desc: 'ห้องพักสไตล์ลอฟท์', iconRef: 'couch', sortOrder: 1 },
    { code: 'BNB', nameTh: 'B&B', nameEn: 'Bed & Breakfast', desc: 'พักรวมอาหารเช้า', iconRef: 'bed', sortOrder: 2 },
  ]
  for (const pt of propertyTypes) {
    const existing = await prisma.propertyTypeMaster.findUnique({ where: { code: pt.code } })
    if (!existing) await prisma.propertyTypeMaster.create({ data: pt })
  }

  // Hotel types (master data)
  const hotelTypes = [
    { code: 'BUDGET', nameTh: 'โรงแรมประหยัด', nameEn: 'Budget', desc: 'ราคาประหยัด', iconRef: 'bed', sortOrder: 0 },
    { code: 'MIDSCALE', nameTh: 'โรงแรมระดับกลาง', nameEn: 'Midscale', desc: '3-4 ดาว', iconRef: 'home', sortOrder: 1 },
    { code: 'LUXURY', nameTh: 'โรงแรมหรู', nameEn: 'Luxury', desc: '5 ดาว / Boutique', iconRef: 'star', sortOrder: 2 },
    { code: 'RESORT', nameTh: 'รีสอร์ท', nameEn: 'Resort', desc: 'รีสอร์ทพักผ่อน', iconRef: 'tree', sortOrder: 3 },
  ]
  for (const ht of hotelTypes) {
    const existing = await prisma.hotelTypeMaster.findUnique({ where: { code: ht.code } })
    if (!existing) await prisma.hotelTypeMaster.create({ data: ht })
  }

  for (const loc of locations) {
    const existing = await prisma.location.findFirst({ where: { name: loc.name, province: loc.province } })
    const location = existing ?? (await prisma.location.create({ data: { name: loc.name, province: loc.province } }))
    for (const zoneName of loc.zones) {
      const z = await prisma.locationZone.findFirst({ where: { locationId: location.id, name: zoneName } })
      if (!z) await prisma.locationZone.create({ data: { locationId: location.id, name: zoneName } })
    }
  }

  // Demo owner
  const ownerEmail = 'owner@pms.local'
  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } })
  if (!existingOwner) {
    await prisma.user.create({
      data: {
        email: ownerEmail,
        name: 'Demo Owner',
        passwordHash: await hash('owner1234', 10),
        role: UserRole.OWNER,
        saleSlug: 'demo',
      },
    })
  }

  // Demo admin (Company panel — apps/m)
  const adminEmail = 'admin@pms.local'
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        passwordHash: await hash('admin1234', 10),
        role: UserRole.SUPER_ADMIN,
      },
    })
  }

  // Demo staff
  const staffEmail = 'staff@pms.local'
  const existingStaff = await prisma.user.findUnique({ where: { email: staffEmail } })
  if (!existingStaff) {
    await prisma.user.create({
      data: {
        email: staffEmail,
        name: 'Demo Staff',
        passwordHash: await hash('staff1234', 10),
        role: UserRole.STAFF,
      },
    })
  }

  console.log('✅ Seed completed')
  console.log('   Owner: owner@pms.local / owner1234')
  console.log('   Admin: admin@pms.local / admin1234')
  console.log('   Staff: staff@pms.local / staff1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
