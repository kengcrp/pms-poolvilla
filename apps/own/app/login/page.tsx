'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button, Icon, Input, Label } from '@pms/ui'

function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState('owner@pms.local')
  const [password, setPassword] = useState('owner1234')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      return
    }
    // Land on calendar (dashboard is feature-locked for now).
    router.push(search.get('callbackUrl') ?? '/manage/calendar')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label required htmlFor="email">
          อีเมล
        </Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div>
        <Label required htmlFor="password">
          รหัสผ่าน
        </Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          <Icon name="warning" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Icon name="spinner" spin className="size-4" />
            กำลังเข้าสู่ระบบ...
          </>
        ) : (
          'เข้าสู่ระบบ'
        )}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50/40 px-4">
      <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-brand-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-brand-300/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Icon name="beach" className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">PMS Pool Villa</h1>
          <p className="mt-1 text-sm text-gray-600">เข้าสู่ระบบเจ้าของที่พัก</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-gray-900/5 ring-1 ring-gray-900/5">
          <Suspense fallback={<div className="py-8 text-center text-sm text-gray-500">กำลังโหลด...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Demo: <code className="rounded bg-white px-1.5 py-0.5 ring-1 ring-gray-200">owner@pms.local</code> /{' '}
          <code className="rounded bg-white px-1.5 py-0.5 ring-1 ring-gray-200">owner1234</code>
        </p>
      </div>
    </div>
  )
}
