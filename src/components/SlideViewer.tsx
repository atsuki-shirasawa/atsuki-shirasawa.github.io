import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronIcon } from './icons/UiIcons'
import { useFullscreen } from '../hooks/useFullscreen'
import { useSlideKeys } from '../hooks/useSlideKeys'
import { useSwipe } from '../hooks/useSwipe'
import { clampPage } from '../lib/page'
import {
  cMapPath,
  pdfPath,
  posterImage,
  standardFontPath,
  thumbImage,
  thumbTemplate,
} from '../lib/paths'
import { createSlideViewer, type SlideViewerHandle, type ViewerState } from '../lib/slideViewer'
import type { Deck } from '../types'
import styles from './SlideViewer.module.css'

type Props = {
  deck: Deck
  /** 現在ページ（1 始まり）。URL の ?p= と同期している */
  page: number
  onPageChange: (page: number) => void
}

/**
 * ページ送りの操作（ボタン・キーボード・スワイプ）と現在ページの持ち方だけを見る。
 * 描画とリサイズは lib/slideViewer.ts（React 非依存）に預けている。
 */
export default function SlideViewer({ deck, page, onPageChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const linkRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLImageElement>(null)
  const stripRef = useRef<HTMLOListElement>(null)
  const viewerRef = useRef<SlideViewerHandle | null>(null)
  /** エンジンの起動は 1 度きりなので、初期ページだけ ref 経由で渡す */
  const initialPageRef = useRef(page)

  const [state, setState] = useState<ViewerState>('loading')
  const total = deck.pageCount

  const go = useCallback(
    (next: number) => onPageChange(clampPage(next, total)),
    [onPageChange, total],
  )

  const turn = useCallback((direction: 1 | -1) => go(page + direction), [go, page])
  const toggleFullscreen = useFullscreen(stageRef)

  /*
   * PDF 内リンクの飛び先。エンジンの組み立ては下の effect が持つが、その依存に go を
   * 置くとページを送るたびにエンジンごと作り直される（go は現在ページを閉じ込めて
   * いるので必ず作り直される）。実測でページ送り 1 回ごとに pdf.worker と
   * slides.pdf を取り直し、先読みしたページも全部捨てていた。ref 越しに渡す。
   */
  const goRef = useRef(go)
  useEffect(() => {
    goRef.current = go
  }, [go])

  useSlideKeys({ page, total, go, onToggleFullscreen: toggleFullscreen })
  useSwipe(stageRef, turn)

  // pdf.js のエンジンはデッキごとに 1 度だけ組み立てる
  useEffect(() => {
    const stage = stageRef.current
    const box = boxRef.current
    const canvas = canvasRef.current
    const textLayer = textRef.current
    const linkLayer = linkRef.current
    const poster = posterRef.current
    if (!stage || !box || !canvas || !textLayer || !linkLayer || !poster) return

    const viewer = createSlideViewer({
      stage,
      box,
      canvas,
      textLayer,
      linkLayer,
      poster,
      total: deck.pageCount,
      pdfUrl: pdfPath(deck.slug),
      cMapUrl: cMapPath(),
      fontUrl: standardFontPath(),
      stillTemplate: thumbTemplate(deck.slug),
      posterSrc: posterImage(deck.slug),
      initialPage: initialPageRef.current,
      onState: setState,
      onNavigate: (target: number) => goRef.current(target),
    })
    viewerRef.current = viewer

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [deck.slug, deck.pageCount])

  // 現在ページが動いたら描き直しを頼み、フィルムストリップを追従させる
  useEffect(() => {
    viewerRef.current?.show(page)
    const strip = stripRef.current
    const active = strip?.querySelector<HTMLElement>('[aria-current="true"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [page])

  return (
    <section
      className={styles.viewer}
      data-state={state}
      aria-roledescription="slide deck"
      aria-label={deck.title}
    >
      <div className={styles.stage} ref={stageRef} style={{ aspectRatio: String(deck.aspect) }}>
        {/* 描いたページに合わせて script が寸法を決める。テキストとリンクの層が canvas と揃う */}
        <div className={styles.page} ref={boxRef}>
          <canvas className={styles.canvas} ref={canvasRef} />
          <div className="textLayer" ref={textRef} />
          <div className={styles.links} ref={linkRef} />
        </div>

        <img
          className={styles.poster}
          ref={posterRef}
          src={posterImage(deck.slug)}
          alt={deck.title}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />

        {state === 'loading' && <p className={styles.note}>Loading slides…</p>}
        {state === 'failed' && (
          <p className={`${styles.note} ${styles.noteFail}`}>
            Couldn't display the slides
            <a href={pdfPath(deck.slug)} download>
              Download PDF
            </a>
          </p>
        )}

        <button
          className={styles.nav}
          data-nav="prev"
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
        >
          <ChevronIcon direction="left" />
          <span className="visually-hidden">Previous slide</span>
        </button>
        <button
          className={styles.nav}
          data-nav="next"
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= total}
        >
          <ChevronIcon direction="right" />
          <span className="visually-hidden">Next slide</span>
        </button>
      </div>

      <div className={styles.bar}>
        <p className={`font-mono ${styles.counter}`} aria-live="polite">
          {page} / {total}
        </p>
        <p className={`font-mono ${styles.hint}`}>← → to turn pages / F for fullscreen</p>
        <button className={styles.fullscreen} type="button" onClick={toggleFullscreen}>
          Fullscreen
        </button>
      </div>

      <ol className={styles.strip} ref={stripRef} role="list" aria-label="All pages">
        {Array.from({ length: total }, (_, index) => index + 1).map((number) => (
          <li className={styles.stripItem} key={number}>
            <button
              className={styles.stripButton}
              type="button"
              style={{ aspectRatio: String(deck.aspect) }}
              aria-current={number === page ? 'true' : 'false'}
              onClick={() => go(number)}
            >
              <img src={thumbImage(deck.slug, number)} alt="" loading="lazy" decoding="async" />
              <span className={`font-mono ${styles.stripNum}`}>{number}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
