import { useMemo } from 'react'
import ExternalLink from './ExternalLink'
import { github } from '../data/content'
import { profile } from '../data/profile'
import { useDayTooltip } from '../hooks/useDayTooltip'
import { currentStreak, formatCount, longestStreak, readCalendar } from '../lib/contributions'
import { GitHubIcon } from './icons/BrandIcons'
import type { ContributionLevel } from '../types'

/**
 * 濃さから地色を引く。強度は JS が持っているので、CSS 側で [data-level='N'] を
 * 5 本並べるより表で持つほうが短い。Record にしておくと段階を足したときに
 * ここが埋まっていないことを型が言う。
 */
const HEAT: Record<ContributionLevel, string> = {
  0: 'bg-heat-0',
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
}

/** 凡例に並べる濃さ */
const LEVELS = Object.keys(HEAT).map(Number) as ContributionLevel[]

/** 並びに合わせて幅いっぱいまで広がるマス */
/*
 * 日付と本数を出す小さな札。1 行しか入らない（whitespace-nowrap）ので、
 * 行送りは読みやすさではなく札の高さを決めているだけ。1.3 は 11px で 14px。
 */
const TOOLTIP =
  'font-mono pointer-events-none absolute z-3 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md bg-fg px-2 py-1.25 text-meta leading-[1.3] whitespace-nowrap text-bg'

const CELL = 'block aspect-square w-full rounded-xs'
/** 凡例のマスだけは広げず 10px で固定する */
const LEGEND_CELL = 'block size-2.5 flex-none rounded-xs'

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
        {/* 箱は .section-links が持つ。リンクはホバーの色だけを書く */}
        <div className="section-links">
          <ExternalLink href={profile.links.github} className="tap text-muted hover:text-fg">
            {/*
              WRITING と同じ形。媒体の色はアイコンだけが持ち、文字はホバーでそれに寄る。
              GitHub のマークは単色なので、その色は --fg（明で黒、暗で白）になる。
            */}
            <GitHubIcon size={13} className="text-fg" />
            github.com/{github.login} ↗
          </ExternalLink>
        </div>
      </div>

      <div className="card flex flex-col gap-5 p-6 max-tight:p-4.5">
        <div className="relative" ref={wrapRef} {...surface}>
          <div className="overflow-x-auto overflow-y-hidden pb-0.5">
            {/* 幅いっぱいまでマスを広げる。53 週ぶんが 10px を切る幅では横スクロールに逃がす */}
            <div className="flex w-full min-w-min flex-col gap-1.5">
              {/* ラベルは列より広いので、そのまま右の列へはみ出させる */}
              <div
                className="font-mono grid w-full auto-cols-[minmax(10px,1fr)] grid-flow-col gap-0.75"
                aria-hidden="true"
              >
                {months.map((month, index) => (
                  <span
                    className="text-micro leading-none whitespace-nowrap text-faint"
                    key={`${month}-${index}`}
                  >
                    {month}
                  </span>
                ))}
              </div>

              <div
                className="grid w-full auto-cols-[minmax(10px,1fr)] grid-flow-col grid-rows-[repeat(7,auto)] gap-0.75"
                role="img"
                aria-label={`Heatmap of ${formatCount(github.totalContributions)} contributions in the last year. Use the arrow keys to read one day at a time.`}
                tabIndex={0}
                {...grid}
              >
                {cells.map((day, index) =>
                  day ? (
                    <span
                      key={day.d}
                      // 矢印キーで選んでいるマスはホバーより強く囲む。どこにいるか見失わせない
                      className={`${CELL} ${HEAT[day.l]} ${
                        tip?.index === index
                          ? 'outline-2 outline-fg outline-offset-1'
                          : 'hover:outline-1 hover:outline-muted hover:outline-offset-1'
                      }`}
                      data-index={index}
                    />
                  ) : (
                    <span key={`empty-${index}`} className={`${CELL} bg-transparent`} />
                  ),
                )}
              </div>
            </div>
          </div>

          {tip && (
            <p
              className={TOOLTIP}
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

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-t-line2 pt-4">
          <div className="flex flex-wrap gap-x-7 gap-y-4 max-tight:gap-x-5">
            {stats.map((stat) => (
              <div className="flex flex-col gap-0.5" key={stat.label}>
                {/* 年間合計はほかの数字と同格にしない。ここだけ計器ではなく見出しの声で読ませる */}
                <span
                  className={
                    stat.lead
                      ? 'display-metric text-display-lg font-semibold text-fg'
                      : 'font-mono text-display-xs font-semibold text-fg'
                  }
                >
                  {formatCount(stat.value)}
                </span>
                <span className="text-note text-faint">{stat.label}</span>
              </div>
            ))}
          </div>
          {/* 統計が折り返しても、凡例は右端に居させる */}
          <div className="ml-auto flex items-center gap-1 text-meta text-faint" aria-hidden="true">
            <span className="mr-0.5">Less</span>
            {LEVELS.map((level) => (
              <span className={`${LEGEND_CELL} ${HEAT[level]}`} key={level} />
            ))}
            <span className="ml-0.5">More</span>
          </div>
        </div>
      </div>
    </section>
  )
}
