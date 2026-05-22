import { PageHeader } from '@/components/PageHeader'
import { Placeholder } from '@/components/Placeholder'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="money"
        title="ปรับราคา (Admin)"
        subtitle="ปรับราคาที่พักในระบบ — ใช้สำหรับ override หรือกำหนดราคาพิเศษ"
      />
      <Placeholder
        icon="money"
        title="ปรับราคาแบบ Bulk"
        message="ปรับราคารายวัน / สัปดาห์ ของหลายที่พักพร้อมกันจากฝั่ง Admin"
        phase="Phase M2"
      />
    </div>
  )
}
