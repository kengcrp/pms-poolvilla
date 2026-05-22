import { PageHeader } from '@/components/PageHeader'
import { Placeholder } from '@/components/Placeholder'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="postpone"
        title="เลื่อนวันเข้าพัก"
        subtitle="คำขอเลื่อนวันเข้าพักจากลูกค้า / เจ้าของ"
      />
      <Placeholder
        icon="postpone"
        title="คิวอนุมัติเลื่อนวัน"
        message="ตรวจสอบและอนุมัติคำขอ postpone — sync กับ booking + calendar อัตโนมัติ"
        phase="Phase M2"
      />
    </div>
  )
}
