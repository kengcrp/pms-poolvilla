'use client'

import { useState, type ReactNode } from 'react'
import { Icon } from '@pms/ui'
import { Sidebar } from './Sidebar'
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
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 flex size-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            aria-label={t('shell.openMenu')}
          >
            <Icon name="menu" className="size-5" />
          </button>

          <div className="hidden lg:block" />

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
            <form action={signOutAction}>
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
