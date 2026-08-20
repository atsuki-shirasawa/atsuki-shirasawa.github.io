import { useCallback, useEffect, useRef, useState } from 'react'
import { createSlideViewer, type SlideViewerHandle, type ViewerState } from '../lib/slideViewer'
import { cMapPath, pdfPath, posterImage, standardFontPath, thumbImage, thumbTemplate } from '../lib/paths'
import type { Deck } from '../types'
import styles from './SlideViewer.module.css'

type Props = {
  deck: Deck
  /** 現在ページ（1 始まり）。URL の ?p= と同期している */
  page: number
  onPageChange: (page: number) => void
}

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
    (next: number) => onPageChange(Math.min(Math.max(next, 1), total)),
    [onPageChange, total],
  )

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
      onNavigate: go,
    })
    viewerRef.current = viewer

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [deck.slug, deck.pageCount, go])

  // 現在ページが動いたら描き直しを頼み、フィルムストリップを追従させる
  useEffect(() => {
    viewerRef.current?.show(page)
    const strip = stripRef.current
    const active = strip?.querySelector<HTMLElement>('[aria-current="true"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [page])

  // キーボード操作
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          go(page + 1)
          event.preventDefault()
          break
        case 'ArrowLeft':
        case 'PageUp':
          go(page - 1)
          event.preventDefault()
          break
        case 'Home':
          go(1)
          event.preventDefault()
          break
        case 'End':
          go(total)
          event.preventDefault()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [go, page, total])

  // タッチ端末のスワイプ
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let startX = 0
    let startY = 0
    let tracking = false

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      startX = event.clientX
      startY = event.clientY
      tracking = true
    }
    const onUp = (event: PointerEvent) => {
      if (!tracking) return
      tracking = false
      // スライドの文字は選択できるので、文字を拾ったドラッグはスワイプではない
      if (!document.getSelection()?.isCollapsed) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return
      go(page + (dx < 0 ? 1 : -1))
    }
    const onCancel = () => {
      tracking = false
    }

    stage.addEventListener('pointerdown', onDown)
    stage.addEventListener('pointerup', onUp)
    stage.addEventListener('pointercancel', onCancel)
    return () => {
      stage.removeEventListener('pointerdown', onDown)
      stage.removeEventListener('pointerup', onUp)
      stage.removeEventListener('pointercancel', onCancel)
    }
  }, [go, page])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void stageRef.current?.requestFullscreen?.()
    }
  }

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
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 4 7 12l8 8" />
          </svg>
          <span className="visually-hidden">Previous slide</span>
        </button>
        <button
          className={styles.nav}
          data-nav="next"
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= total}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 4l8 8-8 8" />
          </svg>
          <span className="visually-hidden">Next slide</span>
        </button>
      </div>

      <div className={styles.bar}>
        <p className={`mono ${styles.counter}`} aria-live="polite">
          {page} / {total}
        </p>
        <p className={`mono ${styles.hint}`}>← → to turn pages / F for fullscreen</p>
        <button className={styles.fullscreen} type="button" onClick={toggleFullscreen}>
          Fullscreen
        </button>
      </div>

      <ol className={styles.strip} ref={stripRef} aria-label="All pages">
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
              <span className={`mono ${styles.stripNum}`}>{number}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
