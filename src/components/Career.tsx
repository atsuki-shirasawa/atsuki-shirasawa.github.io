import { career } from '../data/profile'
import { currentYear } from '../lib/time'
import styles from './Career.module.css'

/** 2010 — 2016 / 2022 — Present */
function formatPeriod(from: number, to: number | null) {
  return `${from} — ${to ?? 'Present'}`
}

export default function Career() {
  return (
    <section className="section section-joined">
      <div className="section-head">
        <h2 className="section-title">CAREER</h2>
      </div>
      <div>
        {career.map((entry, index) => {
          const years = (entry.to ?? currentYear) - entry.from
          // 勤め先は変わったときだけ出す。同じ会社の中の異動で繰り返さない
          const showOrg = entry.org && entry.org !== career[index - 1]?.org

          return (
            <div className={styles.row} key={`${entry.from}-${entry.role}`}>
              <span className={`mono ${styles.period}`}>
                {formatPeriod(entry.from, entry.to)}
                <span className={styles.years}>
                  {years} {years === 1 ? 'yr' : 'yrs'}
                </span>
              </span>
              <div className={styles.body}>
                <span className={styles.role}>
                  {entry.role}
                  {showOrg && <span className={styles.org}>{entry.org}</span>}
                </span>
                <span className={styles.desc}>{entry.desc}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
