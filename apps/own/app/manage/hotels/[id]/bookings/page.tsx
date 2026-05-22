import { HotelBookingsManager } from '@/components/hotel/HotelBookingsManager'

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <HotelBookingsManager params={props.params} />
}
