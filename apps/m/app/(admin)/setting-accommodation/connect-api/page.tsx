import { PageHeader } from '@/components/PageHeader'
import { Placeholder } from '@/components/Placeholder'

export default function Page() {
  return (
    <div>
      <PageHeader
        icon="link"
        title="เชื่อมต่อ API"
        subtitle="iCal / Airbnb / Booking.com — sync ปฏิทินจากภายนอก"
      />
      <Placeholder
        icon="link"
        title="ตั้งค่า Integration"
        message="กำหนด URL iCal และ key เชื่อมต่อกับ OTA ภายนอก (Airbnb, Booking.com)"
        phase="Phase M3"
      />
    </div>
  )
}
