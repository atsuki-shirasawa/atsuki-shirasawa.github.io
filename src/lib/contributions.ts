// GitHub のコントリビューションヒートマップの集計と文言。React に依存しない。
// 描画（升目・吹き出しの位置）は GitHubActivity、吹き出しの操作は useDayTooltip。
import type { ContributionDay } from '../types'

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const numberFormat = new Intl.NumberFormat('en-US')

export const formatCount = (value: number) => numberFormat.format(value)

/** YYYY-MM-DD。GraphQL がくれる形が決まっているので Date を通さず切り出す */
function parseDay(value: string) {
  return {
    year: value.slice(0, 4),
    month: Number(value.slice(5, 7)),
    dayOfMonth: Number(value.slice(8, 10)),
  }
}

export type Calendar = {
  /** 週の端の空マスも含めた並び。升目の data-index はこの添字 */
  cells: (ContributionDay | null)[]
  /** 空マスを除いた実日。集計はこちらを使う */
  days: ContributionDay[]
  /** 列（週）ごとの月ラベル */
  months: string[]
  /** いちばん新しい日の添字。キーボードで入ったときの出発点 */
  latest: number
}

export function readCalendar(weeks: (ContributionDay | null)[][]): Calendar {
  const cells = weeks.flat()
  return {
    cells,
    // 週の端の空マスはヒートマップの升目合わせ用なので、集計からは外す
    days: cells.filter((day): day is ContributionDay => day !== null),
    months: monthLabels(weeks),
    latest: cells.reduce((found, day, index) => (day ? index : found), 0),
  }
}

/** ヒートマップから連続コントリビューション日数の最長記録を出す */
export function longestStreak(days: ContributionDay[]): number {
  let best = 0
  let running = 0
  for (const day of days) {
    running = day.c > 0 ? running + 1 : 0
    best = Math.max(best, running)
  }
  return best
}

/**
 * 今日から遡って何日続いているか。今日はまだ手を付けていないだけということがあるので、
 * 末尾の 1 日が 0 でも記録は切らずに読み飛ばす
 */
export function currentStreak(days: ContributionDay[]): number {
  let streak = 0
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].c > 0) streak += 1
    else if (index !== days.length - 1) break
  }
  return streak
}

/**
 * 列（週）ごとの月ラベル。その月の 1 日を含む週にだけ名前を置くので、
 * 端で切れている月には付かず、ラベルどうしがぶつかることもない
 */
function monthLabels(weeks: (ContributionDay | null)[][]): string[] {
  return weeks.map((week) => {
    const opener = week.find((day) => day && parseDay(day.d).dayOfMonth === 1)
    return opener ? MONTH_NAMES[parseDay(opener.d).month - 1] : ''
  })
}

/** ツールチップの文言。2026-08-20 → 7 contributions · Aug 20, 2026 */
export function dayLabel(day: ContributionDay): string {
  const { year, month, dayOfMonth } = parseDay(day.d)
  const date = `${MONTH_NAMES[month - 1]} ${dayOfMonth}, ${year}`
  if (day.c === 0) return `No contributions · ${date}`
  return `${formatCount(day.c)} contribution${day.c === 1 ? '' : 's'} · ${date}`
}
