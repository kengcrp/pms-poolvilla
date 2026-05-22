import { PageHeader } from '@/components/PageHeader'
import { CommissionForm } from '@/components/admin/CommissionForm'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="percent"
        title="ค่าคอมมิชชัน"
        subtitle="กำหนดอัตราค่าคอมมิชชันที่บริษัทเก็บจากเจ้าของ"
      />
      <CommissionForm />
    </div>
  )
}
