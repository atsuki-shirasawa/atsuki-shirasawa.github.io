import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { career } from '../data/profile'
import { currentYear } from '../lib/time'
import styles from './CareerTrack.module.css'

/**
 * 経歴を 1 本の道で引く。Hero の主役。
 *
 * 地図をつくっていた年月は測量済みの車線として破線で、エージェントをつくって
 * いる今は実線と現在地の点で描く。節目の年は目盛りだけを打ち、役職ごとの内訳は
 * 下の CAREER が縦のレーンとして続きを持つ。
 */
export default function CareerTrack() {
  const ref = useRef<HTMLDivElement>(null)
  const [drawn, setDrawn] = useState(false)

  // 古い順に並べ直して左から右へ
  const ordered = [...career].sort((a, b) => a.from - b.from)
  const start = ordered[0].from
  const end = currentYear
  const span = Math.max(end - start, 1)
  /** 年をトラック上の位置（%）に直す */
  const at = (year: number) => ((year - start) / span) * 100

  // 在職中の職を「今」の区間とする。そこから右が実線になる
  const present = ordered.find((entry) => entry.to === null) ?? ordered[ordered.length - 1]
  const turn = at(present.from)
  const ticks = [...ordered.map((entry) => entry.from), end]

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setDrawn(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDrawn(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={styles.track}
      ref={ref}
      data-drawn={drawn || undefined}
      role="img"
      aria-label={`Career timeline: map data and computer vision from ${start} to ${present.from}, LLM agents from ${present.from} to now. The list below has the detail.`}
    >
      <div className={`font-mono ${styles.eras}`} aria-hidden="true">
        {/* 位置は custom property で渡す。狭い画面では凡例に落として無効化する */}
        <span className={styles.era} style={{ '--from': 0, '--span': `${turn}%` } as CSSProperties}>
          map data · computer vision
        </span>
        <span
          className={`${styles.era} ${styles.eraNow}`}
          style={{ '--from': `${turn}%`, '--span': `${100 - turn}%` } as CSSProperties}
        >
          LLM agents
        </span>
      </div>

      <div className={styles.rail}>
        {/* 掃くように開くのはこの中だけ。目盛りと現在地は切り取りの外に置く */}
        <div className={styles.line}>
          <span className={styles.lane} style={{ width: `${turn}%` }} />
          <span className={styles.road} style={{ left: `${turn}%`, width: `${100 - turn}%` }} />
        </div>
        <div className={styles.marks} aria-hidden="true">
          {ticks.map((year) => (
            <span className={styles.tick} style={{ left: `${at(year)}%` }} key={year} />
          ))}
          <span className={styles.now} />
        </div>
      </div>

      <div className={`font-mono ${styles.years}`} aria-hidden="true">
        {ticks.map((year, index) => (
          <span
            className={styles.year}
            style={{ left: `${at(year)}%` }}
            data-end={index === ticks.length - 1 ? true : undefined}
            data-first={index === 0 ? true : undefined}
            data-inner={index > 0 && index < ticks.length - 1 ? true : undefined}
            key={year}
          >
            {year}
          </span>
        ))}
      </div>
    </div>
  )
}
