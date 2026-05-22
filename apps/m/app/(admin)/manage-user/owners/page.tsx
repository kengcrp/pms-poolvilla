import { PageHeader } from '@/components/PageHeader'
import { OwnersManager } from '@/components/admin/OwnersManager'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="users"
        title="เจ้าของที่พัก"
        subtitle="เพิ่ม / แก้ไข / ระงับ / เปลี่ยนรหัสผ่าน เจ้าของที่พัก"
      />
      <OwnersManager />
    </div>
  )
}
