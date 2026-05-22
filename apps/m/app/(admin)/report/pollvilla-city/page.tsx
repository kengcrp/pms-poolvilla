import { PageHeader } from '@/components/PageHeader'
import { MarketplaceReport } from '@/components/admin/MarketplaceReport'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="globe"
        title="จองผ่าน Marketplace"
        subtitle="รายงานสัดส่วน source ของการจอง — Marketplace · Direct · OTA"
      />
      <MarketplaceReport />
    </div>
  )
}
