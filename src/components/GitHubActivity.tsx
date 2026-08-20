import { useMemo } from 'react'
import ExternalLink from './ExternalLink'
import { github } from '../data/content'
import { profile } from '../data/profile'
import { useDayTooltip } from '../hooks/useDayTooltip'
import { currentStreak, formatCount, longestStreak, readCalendar } from '../lib/contributions'
import styles from './GitHubActivity.module.css'

/** 凡例の濃さ 0〜4 */
const LEVELS = [0, 1, 2, 3, 4]

type Stat = { value: number; label: string; lead?: boolean }

export default function GitHubActivity() {
  const { cells, days, months, latest } = useMemo(() => readCalendar(github.weeks), [])
  const { wrapRef, tip, surface, grid } = useDayTooltip(cells, latest)

  const stats = useMemo<Stat[]>(
    // 年間合計だけを主にする。週平均と最も濃かった月は年間合計の言い換えなので置かない
    () => [
      { value: github.totalContributions, label: 'contributions (year)', lead: true },
      { value: github.publicRepos, label: 'public repos' },
      { value: currentStreak(days), label: 'current streak (days)' },
      { value: longestStreak(days), label: 'longest streak (days)' },
    ],
    [days],
  )

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">GITHUB ACTIVITY</h2>
        <ExternalLink href={profile.links.github} className={`tap ${styles.headLink}`}>
          github.com/{github.login} ↗
        </ExternalLink>
      </div>

      <div className={`card ${styles.card}`}>
        <div className={styles.heatmapWrap} ref={wrapRef} {...surface}>
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
                aria-label={`Heatmap of ${formatCount(github.totalContributions)} contributions in the last year. Use the arrow keys to read one day at a time.`}
                tabIndex={0}
                {...grid}
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
              <div className={styles.stat} key={stat.label} data-lead={stat.lead || undefined}>
                <span className={`mono ${styles.statValue}`}>{formatCount(stat.value)}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.legend} aria-hidden="true">
            <span>Less</span>
            {LEVELS.map((level) => (
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
