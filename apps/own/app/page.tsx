import { redirect } from 'next/navigation'

export default function Home() {
  // Landing target — calendar (dashboard is feature-locked for now).
  redirect('/manage/calendar')
}
