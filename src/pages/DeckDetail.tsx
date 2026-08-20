import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import DeckLink from '../components/DeckLink'
import DeckTags from '../components/DeckTags'
import ExternalLink from '../components/ExternalLink'
import SlideViewer from '../components/SlideViewer'
import VideoEmbed from '../components/VideoEmbed'
import { deckBySlug, deckNeighbours } from '../data/decks'
import { useQueryUpdate } from '../hooks/useQueryUpdate'
import { deckView, formatDeckDate, type DeckView } from '../lib/deckView'
import { textLang } from '../lib/lang'
import { parsePageParam } from '../lib/page'
import { pdfPath, thumbImage } from '../lib/paths'
import type { Deck } from '../types'
import styles from './DeckDetail.module.css'

const FORMAT_LABEL = { marp: 'Markdown (Marp)', pdf: 'PDF', video: 'Video only' } as const

type Part = { deck: Deck; view: DeckView }

/** 主役の置き場所。録画だけなら動画、借りものなら表紙 1 枚、自前ならビューア */
function Stage({
  deck,
  view,
  page,
  onPageChange,
}: Part & { page: number; onPageChange: (page: number) => void }) {
  if (view.kind === 'video') {
    // 動画が主役なので、見出しを付けずそのまま置く
    return <VideoEmbed video={view.video} title={deck.title} />
  }

  if (view.kind === 'away') {
    return (
      <ExternalLink className={styles.away} href={view.url}>
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
          This deck is distributed by {view.host}. Only the cover slide is quoted here.
        </span>
      </ExternalLink>
    )
  }

  return (
    <>
      <SlideViewer deck={deck} page={page} onPageChange={onPageChange} />
      {deck.video && (
        <section className={styles.video}>
          <h2 className={`mono ${styles.videoTitle}`}>TALK VIDEO</h2>
          <VideoEmbed video={deck.video} title={deck.title} />
        </section>
      )}
    </>
  )
}

/** 資料の入手先。自前のスライドを持つデッキだけが PDF を配れる */
function Source({ deck, view }: Part) {
  if (view.kind === 'video') {
    return (
      <>
        <ExternalLink className={styles.download} href={view.url}>
          Watch on YouTube ↗
        </ExternalLink>
        <p className={styles.sideNote}>No slides for this talk — recording only.</p>
      </>
    )
  }

  if (view.kind === 'away') {
    // よそが配っている資料。取得元へ送り、こちらのコピーは配らない
    return (
      <>
        <ExternalLink className={styles.download} href={view.url}>
          Open the original PDF ↗
        </ExternalLink>
        <p className={styles.sideNote}>
          {deck.pageCount} pages / hosted by {view.host}
        </p>
      </>
    )
  }

  return (
    <>
      <a className={styles.download} href={pdfPath(deck.slug)} download>
        Download PDF
      </a>
      <p className={styles.sideNote}>
        {deck.pageCount} pages / {FORMAT_LABEL[deck.format]}
      </p>
    </>
  )
}

/** 前後のデッキへの送り先 */
function Around({ deck, where, className }: { deck: Deck; where: string; className: string }) {
  return (
    <DeckLink deck={deck} className={className}>
      <span className={`mono ${styles.aroundWhere}`}>{where}</span>
      <span className={styles.aroundTitle} lang={textLang(deck.title)}>
        {deck.title}
      </span>
    </DeckLink>
  )
}

export default function DeckDetail() {
  const { slug = '' } = useParams()
  const [params, update] = useQueryUpdate()
  const deck = deckBySlug(slug)

  useEffect(() => {
    if (deck) document.title = `${deck.title} — Slides`
  }, [deck])

  if (!deck) return <Navigate to="/slides" replace />

  const view = deckView(deck)
  const page = parsePageParam(params.get('p'), deck.pageCount)
  const { older, newer } = deckNeighbours(deck.slug)
  // 1 ページ目は既定なので ?p= を落とす
  const goToPage = (next: number) => update({ p: next <= 1 ? '' : String(next) })

  return (
    <div className="container">
      <p className={styles.breadcrumb}>
        <Link to="/slides">← Slides</Link>
      </p>

      <Stage deck={deck} view={view} page={page} onPageChange={goToPage} />

      <div className={styles.detail}>
        <div className={styles.main}>
          <h1 className={styles.title} lang={textLang(deck.title)}>
            {deck.title}
          </h1>
          <p className={`mono ${styles.meta}`}>
            <span>{formatDeckDate(deck.date)}</span>
            {deck.event && <span>{deck.event}</span>}
            {deck.speaker && <span>{deck.speaker}</span>}
            {view.kind !== 'video' && <span>{deck.pageCount} pages</span>}
            <span>{FORMAT_LABEL[deck.format]}</span>
          </p>
          {deck.description && (
            <p className={styles.desc} lang={textLang(deck.description)}>
              {deck.description}
            </p>
          )}

          <DeckTags tags={deck.tags} className={styles.tags} />

          {deck.links.length > 0 && (
            <div className={styles.linkbox}>
              <p className={`mono ${styles.linkTitle}`}>LINKS</p>
              <ul className={styles.links}>
                {deck.links.map((link) => (
                  <li key={link.url}>
                    <ExternalLink href={link.url}>{link.label} ↗</ExternalLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className={styles.side}>
          <Source deck={deck} view={view} />
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
