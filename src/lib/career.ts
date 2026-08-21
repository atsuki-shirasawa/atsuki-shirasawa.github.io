// 経歴の集計。Hero の横トラック（CareerTrack）と CAREER の縦レーン（Career）は
// 1 枚の同じ図なので、線の引き方に要る数はここで 1 度だけ出す。
// 別々に career を読んで数え直すと、様式のどちらかが必ずずれる。
import { career } from '../data/profile'
import { currentYear } from './time'
import type { CareerEntry } from '../types'

export type CareerLeg = {
  entry: CareerEntry
  /** 2010 — 2016 / 2022 — Present */
  period: string
  /** 在籍年数。在職中は現在年まで数える */
  years: number
  /** 勤め先が変わった行だけ true。同じ会社の中の異動では繰り返さない */
  showOrg: boolean
  /** 在職中の区間。車線を実線にする */
  isCurrent: boolean
  /** いちばん古い区間。ここで線を止める */
  isEarliest: boolean
}

/**
 * CAREER のレーン。profile.ts の並び（新しい順）のまま、上端が現在になる。
 *
 * entries を受け取れるのはテストのため。既定引数なので呼ぶ側は変わらないが、
 * これが無いと「同じ年に区間が 2 つある」「現職の開始年が現在年」のような、
 * 実データには無い並びを試せない（そこで一度 key を衝突させた）。
 */
export function careerLegs(entries: CareerEntry[] = career): CareerLeg[] {
  return entries.map((entry, index) => ({
    entry,
    period: `${entry.from} — ${entry.to ?? 'Present'}`,
    years: (entry.to ?? currentYear) - entry.from,
    showOrg: Boolean(entry.org) && entry.org !== entries[index - 1]?.org,
    isCurrent: entry.to === null,
    isEarliest: index === entries.length - 1,
  }))
}

export type CareerTrack = {
  /** いちばん古い開始年。トラックの左端 */
  start: number
  /** 現在年。トラックの右端 */
  end: number
  /** 破線が実線に変わる年（在職中の区間の開始） */
  turnYear: number
  /** その位置（%）。左が測量済み、右が進行中 */
  turn: number
  /** 目盛りを打つ年。各区間の開始年と現在年 */
  ticks: number[]
  /** 年をトラック上の位置（%）に直す */
  at(year: number): number
}

/** Hero のトラック。古い順に並べ直して左から右へ引く（entries は careerLegs と同じ理由） */
export function careerTrack(entries: CareerEntry[] = career): CareerTrack {
  const ordered = [...entries].sort((a, b) => a.from - b.from)
  const end = currentYear
  // career が空でも落とさない。1 点だけのトラックとして退化させる
  const start = ordered[0]?.from ?? end
  const span = Math.max(end - start, 1)
  const at = (year: number) => ((year - start) / span) * 100
  // 在職中の職を「今」の区間とする。そこから右が実線になる
  const present = ordered.find((entry) => entry.to === null) ?? ordered[ordered.length - 1]
  const turnYear = present?.from ?? start

  return {
    start,
    end,
    turnYear,
    turn: at(turnYear),
    // 重複を落とす。同じ年に区間が 2 つある（同一社内の異動）ときと、現職の開始年が
    // 現在年に等しいときに同じ数が並ぶ。描画側は年をそのまま key にしている
    ticks: [...new Set([...ordered.map((entry) => entry.from), end])],
    at,
  }
}
