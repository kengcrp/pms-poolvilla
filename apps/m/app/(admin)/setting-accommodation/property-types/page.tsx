import { PageHeader } from '@/components/PageHeader'
import { PropertyTypeManager } from '@/components/admin/PropertyTypeManager'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="home"
        title="ประเภทที่พัก"
        subtitle="Master data — เจ้าของจะเลือกตอนสร้างที่พัก"
      />
      <PropertyTypeManager />
    </div>
  )
}
