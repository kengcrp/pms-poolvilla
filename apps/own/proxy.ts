import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const path = req.nextUrl.pathname

  const isAuthPage = path.startsWith('/login')
  const isApiRoute = path.startsWith('/api')
  const isPublicSale = path.startsWith('/sale')

  if (isApiRoute || isPublicSale) return NextResponse.next()

  if (isAuthPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/manage/dashboard', req.url))
    return NextResponse.next()
  }

  if (!isLoggedIn && path.startsWith('/manage')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
