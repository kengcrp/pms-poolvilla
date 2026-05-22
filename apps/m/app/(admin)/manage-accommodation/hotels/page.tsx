import { PageHeader } from '@/components/PageHeader'
import { HotelsListManager } from '@/components/admin/HotelsListManager'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="bed"
        title="โรงแรม"
        subtitle="จัดการโรงแรม + ประเภทห้อง + การจอง (count-based inventory)"
      />
      <HotelsListManager />
    </div>
  )
}
