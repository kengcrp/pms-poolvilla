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

  console.log('✅ Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
