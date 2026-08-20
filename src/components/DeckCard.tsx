import DeckLink from './DeckLink'
import DeckTags from './DeckTags'
import YouTubeThumb from './YouTubeThumb'
import { PlayIcon } from './icons/UiIcons'
import { deckView, formatDeckDate, previewPages } from '../lib/deckView'
import { textLang } from '../lib/lang'
import { thumbImage } from '../lib/paths'
import type { Deck } from '../types'
import styles from './DeckCard.module.css'

type Props = {
  deck: Deck
  /** 最初の数枚だけ先に読み込ませる */
  eager?: boolean
  onTagClick?: (tag: string) => void
}

export default function DeckCard({ deck, eager = false, onTagClick }: Props) {
  const view = deckView(deck)

  return (
    <article className={styles.card}>
      <DeckLink deck={deck} className={styles.hit}>
        <div className={styles.stage} style={{ aspectRatio: String(deck.aspect) }}>
          {view.kind === 'video' ? (
            // 録画だけの登壇。カードの絵は動画のサムネイルになる
            <YouTubeThumb
              id={view.video.id}
              className={styles.page}
              alt={`Talk video for ${deck.title}`}
              loading={eager ? 'eager' : 'lazy'}
            />
          ) : (
            previewPages(deck, view).map((page, index) => (
              <img
                className={styles.page}
                key={page}
                src={thumbImage(deck.slug, page)}
                alt={index === 0 ? `Cover slide of ${deck.title}` : ''}
                aria-hidden={index > 0 ? 'true' : undefined}
                loading={eager && index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                style={{ '--i': index } as React.CSSProperties}
              />
            ))
          )}

          {deck.video && (
            <p
              className={styles.hasVideo}
              data-lead={view.kind === 'video' ? 'true' : undefined}
              title="Talk video"
            >
              <PlayIcon />
              <span className="visually-hidden">Talk video available</span>
            </p>
          )}

          {view.kind !== 'video' && (
            <p className={`mono ${styles.count}`}>
              {deck.pageCount}
              <span className={styles.countUnit}>p</span>
            </p>
          )}
        </div>
        <h3 className={styles.title} lang={textLang(deck.title)}>
          {deck.title}
        </h3>
      </DeckLink>

      <p className={`mono ${styles.meta}`}>
        <span>{formatDeckDate(deck.date)}</span>
        {deck.event && <span className={styles.event}>{deck.event}</span>}
        {/* 外へ出るカードは、どこへ行くのかを先に見せる */}
        {view.kind !== 'viewer' && <span className={styles.away}>{view.host} ↗</span>}
      </p>

      <DeckTags tags={deck.tags} className={styles.tags} onTagClick={onTagClick} />
    </article>
  )
}
