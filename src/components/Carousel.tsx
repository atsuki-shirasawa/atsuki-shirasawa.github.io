import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Carousel.module.css'

type Props = {
  /** 帯の左側。レール固有のもの（ブランドチップ）だけを置く。無くてもよい */
  head?: ReactNode
  /** 矢印の読み上げ名に前置きする言葉 */
  name: string
  children: ReactNode
}

/**
 * 横に流すレール。溢れたときだけ矢印を出し、端まで来たら止める。
 * WRITING と TALKS で共有している。
 */
export default function Carousel({ head, name, children }: Props) {
  const railRef = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: true, scrollable: false })

  const measure = useCallback(() => {
    const el = railRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft >= max - 1, scrollable: max > 1 })
  }, [])

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    measure()
    // サムネイルが遅れて入ると幅が変わるので、寸法の変化を見張る
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  const nudge = (direction: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    const card = el.firstElementChild
    // カード 1 枚ぶんずつ送る。取れなければ画面幅の 8 割で代用する
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  return (
    <div className={styles.group}>
      {(head || edge.scrollable) && (
        <div className={styles.head}>
          {head}
          {edge.scrollable && (
            <div className={styles.nav}>
              <button
                className={styles.arrow}
                type="button"
                onClick={() => nudge(-1)}
                disabled={edge.start}
                aria-label={`Previous ${name}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <button
                className={styles.arrow}
                type="button"
                onClick={() => nudge(1)}
                disabled={edge.end}
                aria-label={`Next ${name}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 溢れているときだけフォーカスできるようにして、矢印キーでも送れるようにする */}
      <ul
        className={styles.track}
        ref={railRef}
        onScroll={measure}
        tabIndex={edge.scrollable ? 0 : -1}
        aria-label={edge.scrollable ? name : undefined}
      >
        {children}
      </ul>
    </div>
  )
}
