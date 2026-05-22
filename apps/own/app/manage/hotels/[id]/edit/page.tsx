import { HotelEditor } from '@/components/hotel/HotelEditor'

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <HotelEditor params={props.params} />
}
