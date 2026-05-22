import { PageHeader } from '@/components/PageHeader'
import { ServiceManager } from '@/components/admin/ServiceManager'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="shop"
        title="บริการเสริม"
        subtitle="Master data ของบริการเสริม — เจ้าของสามารถเปิดขายเสริมในที่พักได้"
      />
      <ServiceManager />
    </div>
  )
}
