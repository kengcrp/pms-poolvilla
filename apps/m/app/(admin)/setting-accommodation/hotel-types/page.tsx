import { PageHeader } from '@/components/PageHeader'
import { HotelTypeManager } from '@/components/admin/HotelTypeManager'

export default function Page() {
  return (
    <div>
      <PageHeader icon="bed" title="ประเภทโรงแรม" subtitle="Master data — Budget / Midscale / Luxury / Resort / Boutique ฯลฯ" />
      <HotelTypeManager />
    </div>
  )
}
