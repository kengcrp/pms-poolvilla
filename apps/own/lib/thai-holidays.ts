/**
 * Thai holidays / festivals lookup.
 *
 * Used to flag dates on the pricing calendar so the owner knows they're about
 * to price a culturally-significant day (and might want to set a premium).
 *
 * Currently covers only fixed-date national holidays + popular non-public
 * occasions tourists care about (Valentine's, Christmas, Halloween). Lunar
 * Buddhist holidays (มาฆบูชา / วิสาขบูชา / อาสาฬหบูชา / เข้าพรรษา / ออกพรรษา /
 * ลอยกระทง) vary per year and aren't included yet — TODO add per-year tables.
 */

export interface ThaiHoliday {
  /** Display label in Thai. */
  name: string
  /** Single emoji for visual flair (used on calendar dots + drawer banner). */
  emoji: string
  /** Whether to suggest a premium price (true for high-demand tourist days). */
  premium: boolean
}

/** MM-DD keyed table of fixed-date Thai holidays. */
const FIXED_DATE_HOLIDAYS: Record<string, ThaiHoliday> = {
  '01-01': { name: 'วันปีใหม่', emoji: '🎉', premium: true },
  '02-14': { name: 'วันวาเลนไทน์', emoji: '💝', premium: true },
  '04-06': { name: 'วันจักรี', emoji: '👑', premium: false },
  '04-13': { name: 'วันสงกรานต์', emoji: '💦', premium: true },
  '04-14': { name: 'วันสงกรานต์', emoji: '💦', premium: true },
  '04-15': { name: 'วันสงกรานต์', emoji: '💦', premium: true },
  '05-01': { name: 'วันแรงงาน', emoji: '🛠️', premium: false },
  '05-04': { name: 'วันฉัตรมงคล', emoji: '👑', premium: false },
  '06-03': { name: 'วันเฉลิมพระชนมพรรษา พระราชินี', emoji: '👑', premium: false },
  '07-28': { name: 'วันเฉลิมพระชนมพรรษา ร.10', emoji: '👑', premium: false },
  '08-12': { name: 'วันแม่แห่งชาติ', emoji: '🌸', premium: true },
  '10-13': { name: 'วันคล้ายวันสวรรคต ร.9', emoji: '🕯️', premium: false },
  '10-23': { name: 'วันปิยมหาราช', emoji: '👑', premium: false },
  '10-31': { name: 'วันฮาโลวีน', emoji: '🎃', premium: false },
  '12-05': { name: 'วันพ่อแห่งชาติ', emoji: '🌼', premium: true },
  '12-10': { name: 'วันรัฐธรรมนูญ', emoji: '📜', premium: false },
  '12-24': { name: 'วันคริสต์มาสอีฟ', emoji: '🎄', premium: true },
  '12-25': { name: 'วันคริสต์มาส', emoji: '🎄', premium: true },
  '12-31': { name: 'วันสิ้นปี', emoji: '🎊', premium: true },
}

/**
 * Look up a Thai holiday for a YYYY-MM-DD date string. Returns null if the
 * date doesn't match any known holiday.
 */
export function getThaiHoliday(dateStr: string): ThaiHoliday | null {
  if (!dateStr || dateStr.length < 10) return null
  const mmdd = dateStr.slice(5, 10)
  return FIXED_DATE_HOLIDAYS[mmdd] ?? null
}

/**
 * Filter a list of YYYY-MM-DD dates → only those that are Thai holidays,
 * paired with their holiday info. Used by DayPriceModal to surface a banner
 * when the owner picks holiday dates.
 */
export function findThaiHolidays(
  dates: string[],
): Array<{ date: string; holiday: ThaiHoliday }> {
  return dates
    .map((d) => {
      const h = getThaiHoliday(d)
      return h ? { date: d, holiday: h } : null
    })
    .filter((x): x is { date: string; holiday: ThaiHoliday } => x !== null)
}
