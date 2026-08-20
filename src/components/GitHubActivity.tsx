import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ContributionDay } from '../types'
import { github } from '../data/content'
import { profile } from '../data/profile'
import styles from './GitHubActivity.module.css'

const numberFormat = new Intl.NumberFormat('en-US')

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

/** ヒートマップから連続コントリビューション日数の最長記録を出す */
function longestStreak(days: ContributionDay[]) {
  let best = 0
  let current = 0
  for (const day of days) {
    current = day.c > 0 ? current + 1 : 0
    best = Math.max(best, current)
  }
  return best
}

/**
 * 今日から遡って何日続いているか。今日はまだ手を付けていないだけということがあるので、
 * 末尾の 1 日が 0 でも記録は切らずに読み飛ばす
 */
function currentStreak(days: ContributionDay[]) {
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
function monthLabels(weeks: (ContributionDay | null)[][]) {
  return weeks.map((week) => {
    const opener = week.find((day) => day && Number(day.d.slice(8)) === 1)
    return opener ? MONTH_NAMES[Number(opener.d.slice(5, 7)) - 1] : ''
  })
}

/** ツールチップの文言。2026-08-20 → 7 contributions · Aug 20, 2026 */
function dayLabel(day: ContributionDay) {
  const month = MONTH_NAMES[Number(day.d.slice(5, 7)) - 1]
  const date = `${month} ${Number(day.d.slice(8))}, ${day.d.slice(0, 4)}`
  if (day.c === 0) return `No contributions · ${date}`
  return `${numberFormat.format(day.c)} contribution${day.c === 1 ? '' : 's'} · ${date}`
}

export default function GitHubActivity() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ text: string; x: number; y: number; index: number } | null>(null)
  /** 指で押して出した吹き出しは、次にどこかを押すまで消さない */
  const stuck = useRef(false)
  /** キーを押しっぱなしにされても取りこぼさないよう、今いるマスは ref でも持つ */
  const activeRef = useRef<number | null>(null)

  const cells = github.weeks.flat()
  // 週の端の空マスはヒートマップの升目合わせ用なので、集計からは外す
  const days = cells.filter((day): day is ContributionDay => day !== null)
  const months = monthLabels(github.weeks)

  // 指で出した吹き出しは、ヒートマップの外を押したら引っ込める
  useEffect(() => {
    if (!tip) return
    function onDocumentDown(event: globalThis.PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) hide()
    }
    document.addEventListener('pointerdown', onDocumentDown)
    return () => document.removeEventListener('pointerdown', onDocumentDown)
  }, [tip])

  // 年間合計だけを主にする。週平均と最も濃かった月は年間合計の言い換えなので置かない
  const stats = [
    { value: github.totalContributions, label: 'contributions (year)', lead: true },
    { value: github.publicRepos, label: 'public repos' },
    { value: currentStreak(days), label: 'current streak (days)' },
    { value: longestStreak(days), label: 'longest streak (days)' },
  ]

  /** いちばん新しい日。キーボードで入ったときの出発点 */
  const latest = cells.reduce((found, day, index) => (day ? index : found), 0)

  /** マスの数字を出す。位置はカード内の座標に直して持つ */
  function showFor(cell: HTMLElement) {
    const wrap = wrapRef.current
    const index = Number(cell.dataset.index)
    const day = cells[index]
    if (!wrap || !day) return

    activeRef.current = index
    const cellBox = cell.getBoundingClientRect()
    const wrapBox = wrap.getBoundingClientRect()
    const x = cellBox.left - wrapBox.left + cellBox.width / 2
    setTip({
      text: dayLabel(day),
      // 端のマスでもカードからはみ出さないよう、寄せられる範囲に丸める
      x: Math.min(Math.max(x, 78), wrapBox.width - 78),
      y: cellBox.top - wrapBox.top,
      index,
    })
  }

  function hide() {
    stuck.current = false
    activeRef.current = null
    setTip(null)
  }

  /** マウスは乗せるだけで出す */
  function onPointerOver(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') return
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-index]')
    if (cell) showFor(cell)
  }

  /** 指は押したマスを出したままにする。乗せっぱなしにできないので */
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch') return
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-index]')
    if (!cell) return
    stuck.current = true
    showFor(cell)
  }

  /** その番号のマスへ移り、横スクロールの外にいれば連れてくる */
  function moveTo(index: number) {
    const cell = wrapRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)
    if (!cell) return
    cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    showFor(cell)
  }

  /** 週の端の空マスは飛ばして隣の日へ */
  function step(from: number, delta: number) {
    for (let index = from + delta; index >= 0 && index < cells.length; index += delta) {
      if (cells[index]) return index
    }
    return from
  }

  // 列が週・行が曜日なので、左右は前後の週、上下は前後の日になる
  const moves: Record<string, number> = {
    ArrowRight: 7,
    ArrowLeft: -7,
    ArrowDown: 1,
    ArrowUp: -1,
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      hide()
      return
    }
    const delta = moves[event.key]
    if (delta === undefined) return
    event.preventDefault()
    const from = activeRef.current
    moveTo(from === null ? latest : step(from, delta))
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">GITHUB ACTIVITY</h2>
        <a
          href={profile.links.github}
          target="_blank"
          rel="noreferrer"
          className={`tap ${styles.headLink}`}
        >
          github.com/{github.login} ↗
        </a>
      </div>

      <div className={`card ${styles.card}`}>
        <div
          className={styles.heatmapWrap}
          ref={wrapRef}
          onPointerOver={onPointerOver}
          onPointerDown={onPointerDown}
          onPointerLeave={() => {
            if (!stuck.current) hide()
          }}
        >
          <div className={styles.heatmapScroll}>
            <div className={styles.heatmapInner}>
              <div className={`mono ${styles.months}`} aria-hidden="true">
                {months.map((month, index) => (
                  <span className={styles.month} key={`${month}-${index}`}>
                    {month}
                  </span>
                ))}
              </div>

              <div
                className={styles.heatmap}
                role="img"
                aria-label={`Heatmap of ${numberFormat.format(github.totalContributions)} contributions in the last year. Use the arrow keys to read one day at a time.`}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onBlur={hide}
              >
                {cells.map((day, index) => (
                  <span
                    key={day?.d ?? `empty-${index}`}
                    className={styles.cell}
                    data-level={day?.l ?? 0}
                    data-empty={day ? undefined : true}
                    data-index={day ? index : undefined}
                    data-active={tip?.index === index ? true : undefined}
                  />
                ))}
              </div>
            </div>
          </div>

          {tip && (
            <p
              className={`mono ${styles.tip}`}
              style={{ left: tip.x, top: tip.y }}
              aria-hidden="true"
            >
              {tip.text}
            </p>
          )}

          {/* role="img" の外に置いて、矢印キーで移った日を読み上げさせる */}
          <p className="visually-hidden" aria-live="polite">
            {tip?.text ?? ''}
          </p>
        </div>

        <div className={styles.footer}>
          <div className={styles.stats}>
            {stats.map((stat) => (
              <div
                className={styles.stat}
                key={stat.label}
                data-lead={'lead' in stat ? true : undefined}
              >
                <span className={`mono ${styles.statValue}`}>{numberFormat.format(stat.value)}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.legend} aria-hidden="true">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                className={`${styles.cell} ${styles.legendCell}`}
                data-level={level}
                key={level}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </section>
  )
}
