import { PageHeader } from '@/components/PageHeader'
import { LocationManager } from '@/components/admin/LocationManager'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="pin"
        title="โลเคชัน"
        subtitle="จัดการโลเคชัน + โซน — เจ้าของจะเลือกตอนสร้างที่พัก"
      />
      <LocationManager />
    </div>
  )
}
