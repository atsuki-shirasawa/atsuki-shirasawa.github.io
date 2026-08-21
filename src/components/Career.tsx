import { careerLegs } from '../lib/career'
// Hero の道が縦に折れて続く節なので、車線の意匠は CareerTrack と 1 枚で持つ
import styles from './CareerTrack.module.css'

export default function Career() {
  return (
    <section className="section section-joined">
      <div className="section-head">
        <h2 className="section-title">CAREER</h2>
      </div>
      <div>
        {careerLegs().map(({ entry, period, years, showOrg, isCurrent, isEarliest }) => (
          <div
            className={`section-row ${styles.leg} py-4.5 max-narrow:gap-2`}
            // 車線の描き分け。在職中の区間だけ実線にして、いちばん古い区間で線を止める
            data-now={isCurrent || undefined}
            data-start={isEarliest || undefined}
            key={`${entry.from}-${entry.role}`}
          >
            {/* 在籍の長さがこの節でいちばん効く情報なので、最薄の扱いをやめる */}
            <span className="font-mono flex flex-col gap-0.5 pt-0.5 text-label tabular-nums text-muted max-narrow:flex-row max-narrow:items-baseline max-narrow:gap-2 max-narrow:pt-0">
              {period}
              <span className="text-meta text-faint">
                {years} {years === 1 ? 'yr' : 'yrs'}
              </span>
            </span>
            <div className="flex flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-lead font-semibold">
                {entry.role}
                {/* 社名は伏せた表記。役職より一段落として添える。折り返して行頭に
                    来たスラッシュは迷子に見えるので、たたんだら落とす */}
                {showOrg && (
                  <span className="text-label font-medium text-faint before:pr-2.5 before:text-line before:content-['/'] max-narrow:before:content-none">
                    {entry.org}
                  </span>
                )}
              </span>
              <span className="text-label leading-prose text-muted">{entry.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
