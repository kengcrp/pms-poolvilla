import { PageHeader } from '@/components/PageHeader'
import { AmenityManager } from '@/components/admin/AmenityManager'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="tags"
        title="สิ่งอำนวยความสะดวก"
        subtitle="Master data — เจ้าของจะเลือกตอนสร้างที่พัก"
      />
      <AmenityManager />
    </div>
  )
}
