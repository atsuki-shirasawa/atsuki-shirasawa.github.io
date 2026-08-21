import DeckLink from './DeckLink'
import DeckTags from './DeckTags'
import PlayBadge from './PlayBadge'
import YouTubeThumb from './YouTubeThumb'
import { aspectStyle, deckView, formatDeckDate, previewPages } from '../lib/deckView'
import { textLang } from '../lib/lang'
import { thumbImage } from '../lib/paths'
import type { Deck } from '../types'

type Props = {
  deck: Deck
  /**
   * 見出しの階層。置いた場所で変わる — /slides は h1 が「Slides」なのでカードは
   * h2、Home の TALKS は節見出しが h2 なのでその下は h3。カード側で固定すると
   * どちらか片方で階層が飛ぶ。
   */
  heading?: 'h2' | 'h3'
  /** 最初の数枚だけ先に読み込ませる */
  eager?: boolean
  onTagClick?: (tag: string) => void
}

/** 重ねたページを載せる台。ホバーで枠が色づき、影が付いて浮く */
const STAGE =
  'relative overflow-hidden rounded-xl border border-line bg-surface transition-[box-shadow,border-color,translate] duration-300 group-hover:-translate-y-1 group-hover:border-accent group-hover:shadow-lift group-focus-visible:-translate-y-1 group-focus-visible:border-accent group-focus-visible:shadow-lift'

/** 重ねる 1 枚。1 ページ目は下に置いたまま、残りはホバー中に順番にめくれる */
const PAGE = 'absolute inset-0 size-full object-cover'
const PAGE_OVER = `${PAGE} opacity-0 group-hover:animate-page-turn group-focus-visible:animate-page-turn`

/** ページ数。どんなスライドの上でも読めるようガラスのチップにする */
const COUNT =
  'font-mono absolute top-2 right-2 -translate-y-1 rounded-full bg-glass px-2 py-1 text-meta leading-none text-on-media opacity-0 backdrop-blur-sm transition-[opacity,translate] duration-250 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100'

export default function DeckCard({ deck, heading: Heading = 'h3', eager = false, onTagClick }: Props) {
  const view = deckView(deck)
  /** 動画が本体のカードでは、再生の的を中央に大きく置く */
  const lead = view.kind === 'video'

  return (
    <article className="flex flex-col gap-2">
      <DeckLink
        deck={deck}
        view={view}
        className="quiet-link group block"
      >
        <div className={STAGE} style={aspectStyle(deck.aspect)}>
          {view.kind === 'video' ? (
            // 録画だけの登壇。カードの絵は動画のサムネイルになる
            <YouTubeThumb
              id={view.video.id}
              className={PAGE}
              alt={`Talk video for ${deck.title}`}
              loading={eager ? 'eager' : 'lazy'}
            />
          ) : (
            previewPages(deck, view).map((page, index) => (
              <img
                className={index === 0 ? PAGE : PAGE_OVER}
                key={page}
                src={thumbImage(deck.slug, page)}
                alt={index === 0 ? `Cover slide of ${deck.title}` : ''}
                aria-hidden={index > 0 ? 'true' : undefined}
                loading={eager && index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                style={index === 0 ? undefined : { animationDelay: `${index * 0.7}s` }}
              />
            ))
          )}

          {deck.video && (
            <PlayBadge
              kind={lead ? 'card' : 'mark'}
              className={
                lead
                  ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                  : 'absolute bottom-2 left-2'
              }
              label="Talk video available"
            />
          )}

          {!lead && (
            <p className={COUNT}>
              {/*
                単位は opacity で落とさない。地はスライドの絵なので比が保証できず、
                白いスライドの上では 2.79:1 だった（数字本体は 4.70:1）。
                --color-on-media のまま置く
              */}
              {deck.pageCount}
              <span className="pl-0.5">p</span>
            </p>
          )}
        </div>
        <Heading
          className="mt-3.5 text-display-2xs leading-lead font-bold text-pretty group-hover:text-accent"
          lang={textLang(deck.title)}
        >
          {deck.title}
        </Heading>
      </DeckLink>

      <p className="font-mono flex flex-wrap gap-x-3 gap-y-1 text-note text-faint">
        <span>{formatDeckDate(deck.date)}</span>
        {deck.event && <span className="text-muted">{deck.event}</span>}
        {/* 外へ出るカードは、どこへ行くのかを先に見せる */}
        {view.kind !== 'viewer' && <span className="text-accent">{view.host} ↗</span>}
      </p>

      <DeckTags
        tags={deck.tags}
        className="mt-0.5 flex flex-wrap gap-1.5 pointer-coarse:gap-2.5"
        onTagClick={onTagClick}
      />
    </article>
  )
}
