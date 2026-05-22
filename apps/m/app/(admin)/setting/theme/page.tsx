import { PageHeader } from '@/components/PageHeader'
import { ThemeForm } from '@/components/admin/ThemeForm'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="image"
        title="ธีมสีและโลโก้"
        subtitle="ปรับแต่งแบรนด์ของระบบ — ชื่อ / สีหลัก / โลโก้"
      />
      <ThemeForm />
    </div>
  )
}
