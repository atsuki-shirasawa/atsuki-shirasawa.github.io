import { describe, expect, it } from 'vitest'
import { currentStreak, dayLabel, formatCount, longestStreak, readCalendar } from './contributions'
import type { ContributionDay } from '../types'

const day = (d: string, c: number): ContributionDay => ({ d, c, l: 0 })
/** 連続する日を作る。2026-03-01 から数える */
const run = (counts: number[]): ContributionDay[] =>
  counts.map((c, index) => day(`2026-03-${String(index + 1).padStart(2, '0')}`, c))

describe('longestStreak', () => {
  it('連続して手を付けた日の最長を返す', () => {
    expect(longestStreak(run([1, 1, 0, 1, 1, 1, 0, 1]))).toBe(3)
  })

  it('端から始まる / 端で終わる連続も数える', () => {
    expect(longestStreak(run([1, 1, 1, 0]))).toBe(3)
    expect(longestStreak(run([0, 1, 1, 1]))).toBe(3)
  })

  it('1 日も無ければ 0', () => {
    expect(longestStreak([])).toBe(0)
    expect(longestStreak(run([0, 0, 0]))).toBe(0)
  })
})

describe('currentStreak', () => {
  /*
   * 「今日はまだ手を付けていないだけ」を記録の途切れにしない、が仕様。
   * 末尾の 1 日だけ読み飛ばし、2 日目からは切る。コメントにしか無かった規則。
   */
  it('末尾まで続いていれば、その長さ', () => {
    expect(currentStreak(run([0, 1, 1, 1]))).toBe(3)
  })

  it('末尾の 1 日が 0 でも切らない', () => {
    expect(currentStreak(run([1, 1, 1, 0]))).toBe(3)
  })

  it('末尾が 2 日 0 なら切れている', () => {
    expect(currentStreak(run([1, 1, 1, 0, 0]))).toBe(0)
  })

  it('直前だけ手を付けた日でも 1 と数える', () => {
    expect(currentStreak(run([0, 0, 1]))).toBe(1)
    expect(currentStreak(run([0, 0, 1, 0]))).toBe(1)
  })

  it('1 日も無ければ 0', () => {
    expect(currentStreak([])).toBe(0)
    expect(currentStreak(run([0, 0, 0]))).toBe(0)
  })
})

describe('readCalendar', () => {
  const weeks = [
    // 先頭週は日曜からではないので、曜日の位置を保つため null で埋まっている
    [null, null, day('2026-02-24', 1), day('2026-02-25', 0)],
    [day('2026-03-01', 5), day('2026-03-02', 2)],
  ]

  it('空マスも含めた並びを cells に、実日だけを days に持つ', () => {
    const calendar = readCalendar(weeks)
    expect(calendar.cells).toHaveLength(6)
    expect(calendar.days.map((d) => d.d)).toEqual([
      '2026-02-24',
      '2026-02-25',
      '2026-03-01',
      '2026-03-02',
    ])
  })

  it('latest はいちばん新しい実日の添字（キーボードの出発点）', () => {
    // cells は [null, null, 24日, 25日, 1日, 2日] なので末尾は 5
    expect(readCalendar(weeks).latest).toBe(5)
  })

  it('月ラベルは 1 日を含む週にだけ置く', () => {
    // 1 週目に 1 日は無く、2 週目に 3/1 がある
    expect(readCalendar(weeks).months).toEqual(['', 'Mar'])
  })

  it('空のヒートマップでも落ちない', () => {
    const empty = readCalendar([])
    expect(empty).toMatchObject({ cells: [], days: [], months: [], latest: 0 })
  })
})

describe('dayLabel', () => {
  it('本数と日付を読ませる。1 本のときだけ単数', () => {
    expect(dayLabel(day('2026-08-20', 7))).toBe('7 contributions · Aug 20, 2026')
    expect(dayLabel(day('2026-08-01', 1))).toBe('1 contribution · Aug 1, 2026')
  })

  it('0 本は数字を出さない', () => {
    expect(dayLabel(day('2026-08-20', 0))).toBe('No contributions · Aug 20, 2026')
  })

  it('桁区切りを入れる', () => {
    expect(dayLabel(day('2026-08-20', 1234))).toBe('1,234 contributions · Aug 20, 2026')
  })

  it('月が範囲外でも undefined を出さない', () => {
    expect(dayLabel(day('2026-13-20', 1))).toBe('1 contribution ·  20, 2026')
  })
})

describe('formatCount', () => {
  it('3 桁ごとに区切る', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1234)).toBe('1,234')
    expect(formatCount(1234567)).toBe('1,234,567')
  })
})
