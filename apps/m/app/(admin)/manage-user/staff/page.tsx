import { PageHeader } from '@/components/PageHeader'
import { StaffManager } from '@/components/admin/StaffManager'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="user"
        title="พนักงาน / Admin"
        subtitle="เพิ่ม / แก้ไข / ระงับ / เปลี่ยนสิทธิ์ — เฉพาะ Super Admin เท่านั้น"
      />
      <StaffManager />
    </div>
  )
}
