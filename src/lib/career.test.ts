import { describe, expect, it } from 'vitest'
import { careerLegs, careerTrack } from './career'
import { currentYear } from './time'
import type { CareerEntry } from '../types'

/** profile.ts と同じ「新しい順」で渡す */
const entries = (...list: CareerEntry[]) => list
const leg = (from: number, to: number | null, role: string, org?: string): CareerEntry => ({
  from,
  to,
  role,
  ...(org ? { org } : {}),
  desc: '',
})

describe('careerLegs', () => {
  it('期間の表記は在職中だけ Present になる', () => {
    const legs = careerLegs(entries(leg(2022, null, 'now'), leg(2019, 2022, 'before')))
    expect(legs.map((l) => l.period)).toEqual(['2022 — Present', '2019 — 2022'])
  })

  it('在籍年数は在職中だけ現在年まで数える', () => {
    const legs = careerLegs(entries(leg(2022, null, 'now'), leg(2016, 2019, 'before')))
    expect(legs[0]?.years).toBe(currentYear - 2022)
    expect(legs[1]?.years).toBe(3)
  })

  it('社名は変わった行だけ出す（同じ会社の異動では繰り返さない）', () => {
    const legs = careerLegs(
      entries(
        leg(2022, null, 'lead', 'Retail'),
        leg(2020, 2022, 'member', 'Retail'),
        leg(2016, 2020, 'research', 'Map'),
      ),
    )
    expect(legs.map((l) => l.showOrg)).toEqual([true, false, true])
  })

  it('社名を持たない行は出さない', () => {
    const legs = careerLegs(entries(leg(2022, null, 'now'), leg(2016, 2022, 'before')))
    expect(legs.map((l) => l.showOrg)).toEqual([false, false])
  })

  it('実線にするのは在職中の区間、線を止めるのはいちばん古い区間', () => {
    const legs = careerLegs(
      entries(leg(2022, null, 'now'), leg(2019, 2022, 'mid'), leg(2010, 2019, 'first')),
    )
    expect(legs.map((l) => l.isCurrent)).toEqual([true, false, false])
    expect(legs.map((l) => l.isEarliest)).toEqual([false, false, true])
  })

  it('空でも落ちない', () => {
    expect(careerLegs([])).toEqual([])
  })
})

describe('careerTrack', () => {
  it('古い順に並べ直して両端を決める', () => {
    const track = careerTrack(entries(leg(2022, null, 'now'), leg(2010, 2022, 'before')))
    expect(track.start).toBe(2010)
    expect(track.end).toBe(currentYear)
  })

  it('破線から実線に変わるのは在職中の区間の開始年', () => {
    const track = careerTrack(
      entries(leg(2022, null, 'now'), leg(2016, 2022, 'mid'), leg(2010, 2016, 'first')),
    )
    expect(track.turnYear).toBe(2022)
  })

  it('位置は % で、左端が 0 で右端が 100', () => {
    const track = careerTrack(entries(leg(2020, null, 'now')))
    expect(track.at(2020)).toBe(0)
    expect(track.at(currentYear)).toBe(100)
  })

  /*
   * ここが本題。ticks は描画側が key={year} で使うので、同じ年が 2 つ並ぶと
   * React の key が衝突する。実データでは起きないが、profile.ts を触った回に
   * 静かに壊れる側だった。
   */
  it('同じ年に区間が 2 つあっても目盛りを重複させない', () => {
    const track = careerTrack(
      // 同一社内の異動。2019 が 2 回出てくる
      entries(leg(2019, null, 'lead', 'Retail'), leg(2019, 2019, 'member', 'Retail')),
    )
    expect(track.ticks).toEqual([...new Set(track.ticks)])
    expect(track.ticks.filter((year) => year === 2019)).toHaveLength(1)
  })

  it('現職の開始年が現在年でも目盛りを重複させない', () => {
    const track = careerTrack(entries(leg(currentYear, null, 'joined this year')))
    expect(track.ticks).toEqual([currentYear])
  })

  it('目盛りは各区間の開始年と現在年', () => {
    const track = careerTrack(
      entries(leg(2022, null, 'now'), leg(2016, 2022, 'mid'), leg(2010, 2016, 'first')),
    )
    expect(track.ticks).toEqual([2010, 2016, 2022, currentYear])
  })

  it('在職中の区間が無ければ、いちばん新しい区間を「今」とみなす', () => {
    const track = careerTrack(entries(leg(2020, 2023, 'last'), leg(2010, 2020, 'first')))
    expect(track.turnYear).toBe(2020)
  })

  it('空でも 1 点に退化して落ちない', () => {
    const track = careerTrack([])
    expect(track.start).toBe(currentYear)
    expect(track.end).toBe(currentYear)
    expect(track.turnYear).toBe(currentYear)
    expect(Number.isFinite(track.turn)).toBe(true)
  })
})
