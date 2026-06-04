'use client'

import { useState, type ReactNode } from 'react'
import { Icon } from '@pms/ui'
import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { I18nProvider, useT } from '@/lib/i18n'

interface Props {
  userName: string
  userInitial: string
  signOutAction: () => Promise<void>
  children: ReactNode
}

export function ManageShell({ userName, userInitial, signOutAction, children }: Props) {
  return (
    <I18nProvider>
      <ShellInner userName={userName} userInitial={userInitial} signOutAction={signOutAction}>
        {children}
      </ShellInner>
    </I18nProvider>
  )
}

function ShellInner({ userName, userInitial, signOutAction, children }: Props) {
  const [open, setOpen] = useState(false)
  const t = useT()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        mobileOpen={open}
        onClose={() => setOpen(false)}
        signOutAction={signOutAction}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          {/* Hamburger — only on tablet (md). Phone uses the bottom tab bar's
              "เมนู" tab so the header stays clean. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 hidden size-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:flex lg:hidden"
            aria-label={t('shell.openMenu')}
          >
            <Icon name="menu" className="size-5" />
          </button>

          {/* Left spacer — when hamburger is hidden (phone + desktop) we need
              an empty element so justify-between pushes the icon group right. */}
          <div className="block md:hidden lg:block" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Notification bell — placeholder (no real notifications yet) */}
            <button
              type="button"
              className="relative flex size-10 items-center justify-center rounded-lg text-brand-600 transition-colors hover:bg-brand-50"
              title={t('shell.notifications')}
              aria-label={t('shell.notifications')}
            >
              <Icon name="bell" className="size-5" />
            </button>

            <LanguageSwitcher />

            <div className="hidden h-6 w-px bg-gray-200 sm:block" />

            <div className="flex items-center gap-2 rounded-full bg-gray-50 px-2.5 py-1.5 text-sm ring-1 ring-inset ring-gray-200 sm:px-3">
              <div className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                {userInitial}
              </div>
              <span className="hidden text-gray-700 sm:inline">{userName}</span>
            </div>
            {/* Logout — desktop only; phone uses the Sidebar drawer's logout
                section (opened via the "เมนู" tab in the bottom bar). */}
            <form action={signOutAction} className="hidden lg:block">
              <button
                type="submit"
                className="flex size-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                title={t('shell.signOut')}
                aria-label={t('shell.signOut')}
              >
                <Icon name="logout" className="size-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Main — extra bottom padding on phone so the fixed MobileTabBar
            doesn't cover the last bit of scrollable content. */}
        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom tab bar — phone only; clicking "เมนู" opens the same Sidebar
          drawer that the tablet hamburger does. */}
      <MobileTabBar onMenuClick={() => setOpen(true)} />
    </div>
  )
}
