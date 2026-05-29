'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'th' | 'en' | 'zh'

export const LANGS: { code: Lang; label: string; countryCode: string }[] = [
  { code: 'en', label: 'English', countryCode: 'gb' },
  { code: 'th', label: 'ไทย', countryCode: 'th' },
  { code: 'zh', label: '中文', countryCode: 'cn' },
]

const STORAGE_KEY = 'pms-lang'
const DEFAULT_LANG: Lang = 'th'

// ─────────── Translation dictionary ───────────
// Key naming: <group>.<key>
// Add more keys as you translate new strings.
type Dict = Record<string, Partial<Record<Lang, string>>>

const dict: Dict = {
  // Sidebar groups
  'menu.group.manage':     { th: 'จัดการข้อมูล',     en: 'Manage Data',   zh: '数据管理' },
  'menu.group.reports':    { th: 'รายงาน',          en: 'Reports',       zh: '报告' },
  'menu.group.salePage':   { th: 'เซลเพจ',          en: 'Sale Page',     zh: '销售页' },
  'menu.group.settings':   { th: 'ตั้งค่าทั่วไป',     en: 'General Settings', zh: '通用设置' },
  'menu.group.other':      { th: 'อื่นๆ',           en: 'Other',         zh: '其他' },

  // Sidebar items — Manage
  'menu.calendar':         { th: 'ปฏิทิน',          en: 'Calendar',      zh: '日历' },
  'menu.bookings':         { th: 'การจอง',          en: 'Bookings',      zh: '预订' },
  'menu.pricing':          { th: 'ปรับราคา',        en: 'Pricing',       zh: '价格' },
  'menu.listings':         { th: 'ลิสติ้งที่พัก',   en: 'Listings',      zh: '房源' },
  'menu.hotels':           { th: 'โรงแรม',          en: 'Hotels',        zh: '酒店' },
  'menu.postpone':         { th: 'เลื่อนวันเข้าพัก', en: 'Postpone',      zh: '推迟' },
  'menu.housekeeper':      { th: 'House Keeper',    en: 'Housekeeping',  zh: '客房服务' },
  'menu.coupons':          { th: 'คูปอง',           en: 'Coupons',       zh: '优惠券' },
  'menu.accounting':       { th: 'ด้านบัญชี',       en: 'Accounting',    zh: '会计' },
  // Reports
  'menu.dashboard':        { th: 'แดชบอร์ด',        en: 'Dashboard',     zh: '仪表板' },
  'menu.transactions':     { th: 'ประวัติการทำรายการ', en: 'Transactions', zh: '交易记录' },
  // Sale Page
  'menu.salePageBookings':  { th: 'ตรวจสอบการจอง',     en: 'Check Bookings',   zh: '查看预订' },
  'menu.salePageCustomers': { th: 'ข้อมูลของลูกค้า',    en: 'Customer Info',    zh: '客户信息' },
  'menu.salePageVideos':    { th: 'อัพโหลดวิดีโอที่พัก', en: 'Upload Videos',    zh: '上传视频' },
  'menu.salePageMain':      { th: 'ยืน Sale Page',     en: 'Sale Page',        zh: '销售页' },
  // Settings
  'menu.settings':               { th: 'ตั้งค่าทั่วไป',     en: 'General Settings', zh: '通用设置' },
  'menu.settingsTheme':          { th: 'ธีม Sale Page',     en: 'Sale Page Theme',  zh: '销售页主题' },
  'menu.settingsPayoutChannels': { th: 'ช่องทางการรับเงิน',  en: 'Payout Channels',  zh: '收款渠道' },
  // Other
  'menu.manual':           { th: 'คู่มือการใช้งาน',   en: 'User Manual',    zh: '用户手册' },
  'menu.premium':          { th: 'แพ็กเกจ Premium',  en: 'Premium Package', zh: '高级套餐' },

  // Shell / header
  'shell.openMenu':        { th: 'เปิดเมนู',        en: 'Open menu',     zh: '打开菜单' },
  'shell.closeMenu':       { th: 'ปิดเมนู',         en: 'Close menu',    zh: '关闭菜单' },
  'shell.signOut':         { th: 'ออกจากระบบ',      en: 'Sign out',      zh: '退出' },
  'shell.languageSelect':  { th: 'เลือกภาษา',       en: 'Select language', zh: '选择语言' },
  'shell.notifications':   { th: 'การแจ้งเตือน',     en: 'Notifications', zh: '通知' },

  // Day of week (full name) — used in calendar headers
  'dow.sunday':            { th: 'อาทิตย์',         en: 'sunday',        zh: '星期日' },
  'dow.monday':            { th: 'จันทร์',          en: 'monday',        zh: '星期一' },
  'dow.tuesday':           { th: 'อังคาร',         en: 'tuesday',       zh: '星期二' },
  'dow.wednesday':         { th: 'พุธ',            en: 'wednesday',     zh: '星期三' },
  'dow.thursday':          { th: 'พฤหัสบดี',       en: 'thursday',      zh: '星期四' },
  'dow.friday':            { th: 'ศุกร์',          en: 'friday',        zh: '星期五' },
  'dow.saturday':          { th: 'เสาร์',          en: 'saturday',      zh: '星期六' },
}

// ─────────── Context ───────────
interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
}

const I18nContext = createContext<I18nValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage on mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (stored === 'th' || stored === 'en' || stored === 'zh') {
      setLangState(stored)
    }
    setMounted(true)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // Ignore — Safari private mode, etc.
    }
  }

  // Avoid hydration mismatch by using default lang on first paint
  const effective = mounted ? lang : DEFAULT_LANG
  return <I18nContext.Provider value={{ lang: effective, setLang }}>{children}</I18nContext.Provider>
}

// ─────────── Hooks ───────────

/** Translate a key. Falls back to TH → key if not found. */
export function useT() {
  const { lang } = useContext(I18nContext)
  return function t(key: string): string {
    const entry = dict[key]
    if (!entry) return key
    return entry[lang] ?? entry.th ?? key
  }
}

export function useLang() {
  return useContext(I18nContext)
}
