import { useEffect } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import SlideViewer from '../components/SlideViewer'
import VideoEmbed from '../components/VideoEmbed'
import { deckAway, deckBySlug, deckNeighbours, formatDeckDate, hostOf } from '../data/decks'
import { textLang } from '../lib/lang'
import { pdfPath, thumbImage } from '../lib/paths'
import { watchUrl } from '../lib/video'
import type { Deck } from '../types'
import styles from './DeckDetail.module.css'

const FORMAT_LABEL = { marp: 'Markdown (Marp)', pdf: 'PDF', video: 'Video only' } as const

/** 前後のデッキへの送り先。よそに実体がある登壇はそのまま外へ出す */
function Around({ deck, where, className }: { deck: Deck; where: string; className: string }) {
  const away = deckAway(deck)
  const body = (
    <>
      <span className={`mono ${styles.aroundWhere}`}>{where}</span>
      <span className={styles.aroundTitle} lang={textLang(deck.title)}>
        {deck.title}
      </span>
    </>
  )

  return away ? (
    <a className={className} href={away} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <Link className={className} to={`/slides/${deck.slug}`}>
      {body}
    </Link>
  )
}

export default function DeckDetail() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const deck = deckBySlug(slug)

  const raw = Number(params.get('p') ?? '1')
  const page = Number.isFinite(raw) && deck ? Math.min(Math.max(Math.trunc(raw), 1), deck.pageCount) : 1

  useEffect(() => {
    if (deck) document.title = `${deck.title} — Slides`
  }, [deck])

  if (!deck) return <Navigate to="/slides" replace />

  const { older, newer } = deckNeighbours(deck.slug)
  /** スライドが無く、録画だけが残っている登壇 */
  const videoOnly = deck.format === 'video'
  /** よそに実体がある登壇。こちらには表紙しか無いので、ビューアは出せない */
  const away = deckAway(deck)

  const goToPage = (next: number) => {
    const merged = new URLSearchParams(params)
    if (next <= 1) merged.delete('p')
    else merged.set('p', String(next))
    // ページ送りは履歴に積まない。戻るで一覧に帰れるようにする
    setParams(merged, { replace: true })
  }

  return (
    <div className="container">
      <p className={styles.breadcrumb}>
        <Link to="/slides">← Slides</Link>
      </p>

      {videoOnly ? (
        // 動画が主役なので、見出しを付けずそのまま置く
        deck.video && <VideoEmbed video={deck.video} title={deck.title} />
      ) : away ? (
        <a className={styles.away} href={away} target="_blank" rel="noreferrer">
          <img
            className={styles.awayCover}
            src={thumbImage(deck.slug, 1)}
            alt={`Cover slide of ${deck.title}`}
            style={{ aspectRatio: String(deck.aspect) }}
          />
          <span className={styles.awayNote}>
            <strong className={styles.awayLead}>
              Open all {deck.pageCount} pages at the source ↗
            </strong>
            This deck is distributed by {hostOf(away)}. Only the cover slide is quoted here.
          </span>
        </a>
      ) : (
        <>
          <SlideViewer deck={deck} page={page} onPageChange={goToPage} />
          {deck.video && (
            <section className={styles.video}>
              <h2 className={`mono ${styles.videoTitle}`}>TALK VIDEO</h2>
              <VideoEmbed video={deck.video} title={deck.title} />
            </section>
          )}
        </>
      )}

      <div className={styles.detail}>
        <div className={styles.main}>
          <h1 className={styles.title} lang={textLang(deck.title)}>
            {deck.title}
          </h1>
          <p className={`mono ${styles.meta}`}>
            <span>{formatDeckDate(deck.date)}</span>
            {deck.event && <span>{deck.event}</span>}
            {deck.speaker && <span>{deck.speaker}</span>}
            {!videoOnly && <span>{deck.pageCount} pages</span>}
            <span>{FORMAT_LABEL[deck.format]}</span>
          </p>
          {deck.description && (
            <p className={styles.desc} lang={textLang(deck.description)}>
              {deck.description}
            </p>
          )}

          {deck.tags.length > 0 && (
            <p className={styles.tags}>
              {deck.tags.map((tag) => (
                <Link
                  className={`mono ${styles.tag}`}
                  to={`/slides?tag=${encodeURIComponent(tag)}`}
                  key={tag}
                >
                  {tag}
                </Link>
              ))}
            </p>
          )}

          {deck.links.length > 0 && (
            <div className={styles.linkbox}>
              <p className={`mono ${styles.linkTitle}`}>LINKS</p>
              <ul className={styles.links}>
                {deck.links.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className={styles.side}>
          {videoOnly ? (
            <>
              {deck.video && (
                <a
                  className={styles.download}
                  href={watchUrl(deck.video)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch on YouTube ↗
                </a>
              )}
              <p className={styles.sideNote}>No slides for this talk — recording only.</p>
            </>
          ) : away ? (
            // よそが配っている資料。取得元へ送り、こちらのコピーは配らない
            <>
              <a className={styles.download} href={away} target="_blank" rel="noreferrer">
                Open the original PDF ↗
              </a>
              <p className={styles.sideNote}>
                {deck.pageCount} pages / hosted by {hostOf(away)}
              </p>
            </>
          ) : (
            <>
              <a className={styles.download} href={pdfPath(deck.slug)} download>
                Download PDF
              </a>
              <p className={styles.sideNote}>
                {deck.pageCount} pages / {FORMAT_LABEL[deck.format]}
              </p>
            </>
          )}
        </aside>
      </div>

      {(older || newer) && (
        <nav className={styles.around} aria-label="Other decks">
          {older ? <Around deck={older} where="← OLDER" className={styles.aroundLink} /> : <span />}
          {newer && (
            <Around
              deck={newer}
              where="NEWER →"
              className={`${styles.aroundLink} ${styles.aroundNext}`}
            />
          )}
        </nav>
      )}
    </div>
  )
}
