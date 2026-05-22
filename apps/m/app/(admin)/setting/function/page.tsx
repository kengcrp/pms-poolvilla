import { PageHeader } from '@/components/PageHeader'
import { FeatureFlagsForm } from '@/components/admin/FeatureFlagsForm'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="sliders"
        title="ฟังก์ชันการทำงาน"
        subtitle="เปิด/ปิด feature ระดับระบบ"
      />
      <FeatureFlagsForm />
    </div>
  )
}
