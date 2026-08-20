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

const FORMAT_LABEL = { marp: 'Markdown (Marp)', pdf: 'PDF', video: 'Video only' } as const

/** 浮く箱。枠と影の振る舞いは @utility lift が持つ */
const LIFT = 'lift group rounded-xl bg-surface text-fg hover:text-fg hover:no-underline'

/** 資料の入手先のボタン。塗りの色は solid-accent が地色と文字色を対で持つ */
const DOWNLOAD =
  'solid-accent inline-flex items-center justify-center rounded-lg px-4.5 py-3 text-center text-body font-semibold'

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
      <ExternalLink
        className={`${LIFT} flex items-center gap-6 p-5 max-snug:flex-col max-snug:items-stretch max-snug:gap-4`}
        href={view.url}
      >
        <img
          className="w-[min(360px,46%)] shrink-0 rounded-lg border border-line object-cover max-snug:w-full"
          src={thumbImage(deck.slug, 1)}
          alt={`Cover slide of ${deck.title}`}
          style={{ aspectRatio: String(deck.aspect) }}
        />
        <span className="text-label leading-support text-muted">
          <strong className="mb-1.5 block text-lead text-fg group-hover:text-accent">
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
        <section className="flex flex-col gap-3.5 pt-10">
          <h2 className="font-mono text-note tracking-caps-wide text-faint">TALK VIDEO</h2>
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
        <ExternalLink className={DOWNLOAD} href={view.url}>
          Watch on YouTube ↗
        </ExternalLink>
        <SideNote>No slides for this talk — recording only.</SideNote>
      </>
    )
  }

  if (view.kind === 'away') {
    // よそが配っている資料。取得元へ送り、こちらのコピーは配らない
    return (
      <>
        <ExternalLink className={DOWNLOAD} href={view.url}>
          Open the original PDF ↗
        </ExternalLink>
        <SideNote>
          {deck.pageCount} pages / hosted by {view.host}
        </SideNote>
      </>
    )
  }

  return (
    <>
      <a className={DOWNLOAD} href={pdfPath(deck.slug)} download>
        Download PDF
      </a>
      <SideNote>
        {deck.pageCount} pages / {FORMAT_LABEL[deck.format]}
      </SideNote>
    </>
  )
}

function SideNote({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-note text-faint max-wide:text-left">{children}</p>
}

/** 前後のデッキへの送り先 */
function Around({ deck, where, align }: { deck: Deck; where: string; align?: 'right' }) {
  return (
    <DeckLink
      deck={deck}
      className={`${LIFT} flex flex-col gap-1.5 px-5 py-4.5 ${
        align === 'right' ? 'text-right max-snug:text-left' : ''
      }`}
    >
      <span className="font-mono text-meta tracking-caps text-faint">{where}</span>
      <span
        className="text-body leading-normal font-semibold group-hover:text-accent"
        lang={textLang(deck.title)}
      >
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
    <div className="wrap">
      <p className="font-mono pt-8 pb-5 text-label">
        <Link to="/slides">← Slides</Link>
      </p>

      <Stage deck={deck} view={view} page={page} onPageChange={goToPage} />

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_240px] gap-10 border-t border-t-line py-10 max-wide:grid-cols-1 max-wide:gap-7">
        <div className="flex flex-col gap-3.5">
          <h1
            className="text-display-sm leading-[1.4] font-bold text-pretty"
            lang={textLang(deck.title)}
          >
            {deck.title}
          </h1>
          <p className="font-mono flex flex-wrap gap-x-4.5 gap-y-1.5 text-note text-faint">
            <span>{formatDeckDate(deck.date)}</span>
            {deck.event && <span>{deck.event}</span>}
            {deck.speaker && <span>{deck.speaker}</span>}
            {view.kind !== 'video' && <span>{deck.pageCount} pages</span>}
            <span>{FORMAT_LABEL[deck.format]}</span>
          </p>
          {deck.description && (
            <p
              className="max-w-[620px] text-lead leading-lead text-pretty text-muted"
              lang={textLang(deck.description)}
            >
              {deck.description}
            </p>
          )}

          <DeckTags tags={deck.tags} className="flex flex-wrap gap-1.5" />

          {deck.links.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-2">
              <p className="font-mono text-meta tracking-caps-wide text-faint">LINKS</p>
              <ul className="flex flex-col gap-1.5 text-body">
                {deck.links.map((link) => (
                  <li key={link.url}>
                    <ExternalLink href={link.url}>{link.label} ↗</ExternalLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-2.5 max-wide:items-start">
          <Source deck={deck} view={view} />
        </aside>
      </div>

      {(older || newer) && (
        <nav
          className="grid grid-cols-2 gap-4 pb-2 max-snug:grid-cols-1"
          aria-label="Other decks"
        >
          {older ? <Around deck={older} where="← OLDER" /> : <span />}
          {newer && <Around deck={newer} where="NEWER →" align="right" />}
        </nav>
      )}
    </div>
  )
}
