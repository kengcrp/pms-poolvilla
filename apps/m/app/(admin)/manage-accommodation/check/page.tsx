import { PageHeader } from '@/components/PageHeader'
import { ApprovalQueue } from '@/components/admin/ApprovalQueue'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="check"
        title="ตรวจสอบ / อนุมัติที่พัก"
        subtitle="คิวจัดการสถานะ — รออนุมัติ · อนุมัติแล้ว · ถูกปฏิเสธ · ปิด"
      />
      <ApprovalQueue />
    </div>
  )
}
