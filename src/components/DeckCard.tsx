import { Link } from 'react-router-dom'
import YouTubeThumb from './YouTubeThumb'
import { deckAway, formatDeckDate, hostOf, previewPages } from '../data/decks'
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
  /** スライドが無く、録画だけの登壇。カードの絵は動画のサムネイルになる */
  const videoOnly = deck.format === 'video'
  const pages = previewPages(deck)
  /** よそに実体がある登壇（配布元の PDF、録画だけの YouTube）はそのまま外へ送る */
  const away = deckAway(deck)

  const body = (
    <>
      <div className={styles.stage} style={{ aspectRatio: String(deck.aspect) }}>
        {videoOnly && deck.video ? (
          <YouTubeThumb
            id={deck.video.id}
            className={styles.page}
            alt={`Talk video for ${deck.title}`}
            loading={eager ? 'eager' : 'lazy'}
          />
        ) : (
          pages.map((page, index) => (
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
          <p className={styles.hasVideo} data-lead={videoOnly ? 'true' : undefined} title="Talk video">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
            <span className="visually-hidden">Talk video available</span>
          </p>
        )}

        {!videoOnly && (
          <p className={`mono ${styles.count}`}>
            {deck.pageCount}
            <span className={styles.countUnit}>p</span>
          </p>
        )}
      </div>
      <h3 className={styles.title} lang={textLang(deck.title)}>
        {deck.title}
      </h3>
    </>
  )

  return (
    <article className={styles.card}>
      {away ? (
        <a className={styles.hit} href={away} target="_blank" rel="noreferrer">
          {body}
        </a>
      ) : (
        <Link className={styles.hit} to={`/slides/${deck.slug}`}>
          {body}
        </Link>
      )}

      <p className={`mono ${styles.meta}`}>
        <span>{formatDeckDate(deck.date)}</span>
        {deck.event && <span className={styles.event}>{deck.event}</span>}
        {away && <span className={styles.away}>{hostOf(away)} ↗</span>}
      </p>

      {deck.tags.length > 0 && (
        <p className={styles.tags}>
          {deck.tags.map((tag) =>
            onTagClick ? (
              <button
                className={`mono ${styles.tag}`}
                type="button"
                key={tag}
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </button>
            ) : (
              // 一覧の外（Home の TALKS）には絞り込む相手がいないので、
              // そのタグで絞った一覧へ送る。DeckDetail のタグと同じ行き先
              <Link
                className={`mono ${styles.tag}`}
                key={tag}
                to={`/slides?tag=${encodeURIComponent(tag)}`}
              >
                {tag}
              </Link>
            ),
          )}
        </p>
      )}
    </article>
  )
}
