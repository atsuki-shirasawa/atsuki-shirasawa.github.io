/**
 * デッキ本体は PDF。pdf.js が現在ページを canvas に描き、その上に本物のテキスト
 * （選択・コピーできる）と PDF が持つリンクを重ねる。1 ページ目は静止画としても
 * 存在していて、pdf.js が描き終わるまでの絵であり、動かなかったときの表示でもある。
 *
 * ここは React に依存しない。DOM 要素を受け取り、描画とリサイズだけを面倒みる。
 * ページ送りの操作（ボタン・キーボード・スワイプ）と現在ページの管理は React 側。
 */
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { clampPage } from './page'

/** Retina までは払う価値がある。それ以上はファイルサイズが増えるだけで見た目は変わらない */
const MAX_DPR = 2
/** canvas 1 枚の上限。4K のフルスクリーンで 130MB のバッファを要求させない */
const MAX_CANVAS_PIXELS = 8_000_000
/** 先読みしておくページ数。枚数だけでなく面積でも制限する（全画面のページは巨大） */
const CACHE_ENTRIES = 4
const CACHE_PIXELS = 24_000_000

export type ViewerState = 'loading' | 'ready' | 'failed'

type Shot = { canvas: HTMLCanvasElement; key: string; width: number; height: number; scale: number }
type RawDims = { pageWidth: number; pageHeight: number; pageX: number; pageY: number }
type Viewport = { width: number; height: number; rawDims: RawDims }
type Page = {
  /** PDF 自身の座標系 [x0, y0, x1, y1] */
  view: number[]
  getViewport(options: { scale: number }): Viewport
  render(options: object): { promise: Promise<void>; cancel(): void }
  streamTextContent(): ReadableStream
  getAnnotations(options: { intent: string }): Promise<any[]>
  cleanup(): void
}
type Draw = { key: string; cancelled: boolean; cancel(): void; promise: Promise<Shot | null> }

export type SlideViewerOptions = {
  stage: HTMLElement
  box: HTMLElement
  canvas: HTMLCanvasElement
  textLayer: HTMLElement
  linkLayer: HTMLElement
  poster: HTMLImageElement
  total: number
  pdfUrl: string
  cMapUrl: string
  fontUrl: string
  /** `{page}` を含むサムネイル URL。pdf.js が動かないときはこれを出す */
  stillTemplate: string
  /** 1 ページ目の静止画 */
  posterSrc: string
  initialPage: number
  onState(state: ViewerState): void
  /** PDF 内リンクでほかのページに飛んだとき */
  onNavigate(page: number): void
}

export type SlideViewerHandle = {
  /** 表示するページを変える。React 側の現在ページが動くたびに呼ぶ */
  show(page: number): void
  destroy(): void
}

export function createSlideViewer(options: SlideViewerOptions): SlideViewerHandle {
  const { stage, box, canvas, textLayer, linkLayer, poster, total } = options

  let pdfjs: any = null
  let doc: any = null
  /** ページを移るたびに増える。古い番号を持って戻ってきたものは捨てる */
  let token = 0
  let current = clampPage(options.initialPage, total)
  let lastPage: Page | null = null
  let disposed = false
  const cache = new Map<number, Shot>()
  const inflight = new Map<number, Draw>()

  /**
   * レイヤーは投げっぱなしで完了させる。握り潰すと「テキストもリンクも無いページ」と
   * 区別が付かなくなるので、失敗は必ず声に出す。
   */
  const detach = (label: string, work: Promise<unknown>) => {
    void work.catch((error) => console.error(`[viewer] ${label} failed`, error))
  }

  /** ステージのどこに、どれだけの精細さで描くか */
  const plan = (unscaled: Viewport) => {
    const stageWidth = stage.clientWidth || 1
    const stageHeight = stage.clientHeight || 1
    const aspect = unscaled.width / unscaled.height
    let width = stageWidth
    let height = stageWidth / aspect
    if (height > stageHeight) {
      height = stageHeight
      width = stageHeight * aspect
    }
    let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    dpr = Math.max(1, Math.min(dpr, Math.sqrt(MAX_CANVAS_PIXELS / (width * height))))
    const scale = width / unscaled.width
    return { width, height, scale, dpr, key: `${Math.round(width)}x${Math.round(height)}@${dpr.toFixed(2)}` }
  }

  type Plan = ReturnType<typeof plan>

  /**
   * 専用の canvas に描く。描き終わるまで画面に出ているものはそのまま。
   *
   * 1 ページにつき同時に走る描画は 1 本だけ。先読みしているページに移動するのは
   * 日常茶飯事で、そこで 2 本目を始めると 1 本目が無駄になる。後から来た方が待つ。
   */
  const draw = (pageNumber: number, page: Page, p: Plan): Promise<Shot | null> => {
    const running = inflight.get(pageNumber)
    if (running) {
      if (running.key === p.key && !running.cancelled) return running.promise
      // もう存在しないサイズ向けに描いているか、すでに諦めたもの。止めて、
      // pdf.js がページを解放するのを待ってから描き直す。
      running.cancel()
      return running.promise.then(() => draw(pageNumber, page, p))
    }

    const viewport = page.getViewport({ scale: p.scale * p.dpr })
    const offscreen = document.createElement('canvas')
    offscreen.width = Math.max(1, Math.round(viewport.width))
    offscreen.height = Math.max(1, Math.round(viewport.height))
    const context = offscreen.getContext('2d', { alpha: false })
    if (!context) return Promise.resolve(null)
    // 先に白を敷く。透過 PDF が黒く出るのを防ぐ
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, offscreen.width, offscreen.height)

    const task = page.render({ canvasContext: context, viewport })
    const entry: Draw = {
      key: p.key,
      cancelled: false,
      cancel: () => {
        entry.cancelled = true
        task.cancel()
      },
      promise: task.promise
        .then((): Shot | null => ({
          canvas: offscreen,
          key: p.key,
          width: p.width,
          height: p.height,
          scale: p.scale,
        }))
        .catch(() => null) // キャンセルされたか壊れたページ。どちらにせよ出すものはない
        .finally(() => {
          if (inflight.get(pageNumber) === entry) inflight.delete(pageNumber)
        }),
    }
    inflight.set(pageNumber, entry)
    return entry.promise
  }

  const remember = (page: number, shot: Shot) => {
    cache.delete(page)
    cache.set(page, shot)
    let pixels = 0
    for (const entry of cache.values()) pixels += entry.canvas.width * entry.canvas.height
    for (const key of [...cache.keys()]) {
      if (cache.size <= 1 || (cache.size <= CACHE_ENTRIES && pixels <= CACHE_PIXELS)) break
      if (key === current || key === page) continue
      const entry = cache.get(key)!
      pixels -= entry.canvas.width * entry.canvas.height
      entry.canvas.width = entry.canvas.height = 0 // GC 待ちにせず、いま解放する
      cache.delete(key)
    }
  }

  /** 消えたサイズ向けに描いたものを捨てる。走行中の描画は draw に任せる */
  const forget = () => {
    for (const entry of cache.values()) entry.canvas.width = entry.canvas.height = 0
    cache.clear()
  }

  /** 描き上がったページを画面に出し、レイヤーの寸法を合わせる */
  const commit = (shot: Shot) => {
    box.style.width = `${shot.width}px`
    box.style.height = `${shot.height}px`
    box.style.setProperty('--total-scale-factor', String(shot.scale))
    canvas.width = shot.canvas.width
    canvas.height = shot.canvas.height
    canvas.getContext('2d', { alpha: false })?.drawImage(shot.canvas, 0, 0)
    options.onState('ready')
  }

  /**
   * 再描画を待たずにステージへ追従する。canvas は引き伸ばされ（一瞬ぼやける）、
   * レイヤーは位置を保つ。pdf.js がテキストをパーセントで置いていて、その下の
   * リンクも同じ置き方をしているため。
   */
  const reflow = () => {
    if (!lastPage) return
    const p = plan(lastPage.getViewport({ scale: 1 }))
    box.style.width = `${p.width}px`
    box.style.height = `${p.height}px`
    box.style.setProperty('--total-scale-factor', String(p.scale))
  }

  const paintText = async (page: Page, scale: number, mine: number) => {
    textLayer.replaceChildren()
    const layer = new pdfjs.TextLayer({
      textContentSource: page.streamTextContent(),
      container: textLayer,
      viewport: page.getViewport({ scale }),
    })
    await layer.render()
    if (mine !== token) {
      textLayer.replaceChildren()
      return
    }
    // pdf.js はスケールから寸法を決めるが、ドリフトしないよう箱に固定する
    textLayer.style.width = '100%'
    textLayer.style.height = '100%'
  }

  /**
   * PDF が持つリンクを組み直す。pdf.js は安全と判断したプロトコルにしか url を
   * 入れないので、妙なものはそもそもリンクにならない。
   */
  const paintLinks = async (page: Page, unscaled: Viewport, mine: number) => {
    linkLayer.replaceChildren()
    const annotations = await page.getAnnotations({ intent: 'display' })
    if (mine !== token) return

    const fragment = document.createDocumentFragment()
    for (const annotation of annotations) {
      if (annotation.subtype !== 'Link') continue

      let element: HTMLElement | null = null
      if (annotation.url) {
        const anchor = document.createElement('a')
        anchor.href = annotation.url
        anchor.target = '_blank'
        anchor.rel = 'noopener noreferrer'
        anchor.title = annotation.url
        element = anchor
      } else if (annotation.dest) {
        const button = document.createElement('button')
        button.type = 'button'
        button.addEventListener('click', () => void jumpTo(annotation.dest))
        element = button
      }
      if (!element) continue

      // PDF の座標はページ下端から上向き。いったんページ内に反転してから、
      // ページに対する割合で表す。pdf.js 自身の注釈レイヤーと同じ計算。
      const { pageWidth, pageHeight, pageX, pageY } = unscaled.rawDims
      const view = page.view
      const [left, top, right, bottom] = pdfjs.Util.normalizeRect([
        annotation.rect[0],
        view[3] - annotation.rect[1] + view[1],
        annotation.rect[2],
        view[3] - annotation.rect[3] + view[1],
      ])
      element.style.left = `${((left - pageX) / pageWidth) * 100}%`
      element.style.top = `${((top - pageY) / pageHeight) * 100}%`
      element.style.width = `${((right - left) / pageWidth) * 100}%`
      element.style.height = `${((bottom - top) / pageHeight) * 100}%`
      fragment.append(element)
    }
    linkLayer.append(fragment)
  }

  /** デッキ内を指すリンク。行き先はページ番号ではなくページオブジェクト */
  const jumpTo = async (dest: unknown) => {
    try {
      const resolved = typeof dest === 'string' ? await doc.getDestination(dest) : dest
      if (!Array.isArray(resolved)) return
      options.onNavigate((await doc.getPageIndex(resolved[0])) + 1)
    } catch {
      // 解決できない行き先は、どこにも飛ばないだけ
    }
  }

  const show = async (pageNumber: number) => {
    if (disposed) return
    current = clampPage(pageNumber, total)

    if (!doc) {
      // pdf.js がまだか、来ないとき。フィルムストリップ用の静止画がすべて
      poster.src =
        current === 1 ? options.posterSrc : options.stillTemplate.replace('{page}', String(current))
      return
    }

    const mine = ++token
    // 隣より遠いページは、もう描き上げる価値がない
    for (const [number, entry] of inflight) {
      if (Math.abs(number - current) > 1) entry.cancel()
    }

    let page: Page
    try {
      page = await doc.getPage(current)
    } catch {
      return
    }
    if (mine !== token || disposed) return
    lastPage = page

    const unscaled = page.getViewport({ scale: 1 })
    const p = plan(unscaled)
    const hit = cache.get(current)
    if (hit && hit.key === p.key) {
      commit(hit)
    } else {
      const shot = await draw(current, page, p)
      if (!shot || mine !== token || disposed) return
      remember(current, shot)
      commit(shot)
    }

    detach('text layer', paintText(page, p.scale, mine))
    detach('link layer', paintLinks(page, unscaled, mine))
    detach('read ahead', ahead(current + 1))
    detach('read ahead', ahead(current - 1))
  }

  /** 何も起きていないうちに隣を描いておく。矢印での移動が即座になる */
  const ahead = async (pageNumber: number) => {
    if (!doc || disposed || pageNumber < 1 || pageNumber > total) return
    try {
      const page: Page = await doc.getPage(pageNumber)
      const p = plan(page.getViewport({ scale: 1 }))
      if (cache.get(pageNumber)?.key === p.key) return
      const shot = await draw(pageNumber, page, p)
      if (shot) remember(pageNumber, shot)
    } catch {
      // 隣が描けなくても、先回りできなかっただけ
    }
  }

  const boot = async () => {
    options.onState('loading')
    try {
      pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
      const loadingTask = pdfjs.getDocument({
        url: options.pdfUrl,
        cMapUrl: options.cMapUrl,
        cMapPacked: true,
        standardFontDataUrl: options.fontUrl,
        isEvalSupported: false,
      })
      doc = await loadingTask.promise
      if (disposed) {
        void loadingTask.destroy()
        return
      }
      await show(current)
    } catch (error) {
      console.error('[viewer] pdf.js could not open the deck', error)
      doc = null
      options.onState('failed')
    }
  }

  // リサイズもフルスクリーンもここに来る。落ち着いてから 1 度だけ描き直す
  // （毎秒 60 回では、そもそも描き終わらない）。最初のサイズを控えておくので、
  // 監視を始めた瞬間に初回描画と二重に走ることはない。
  let settle: ReturnType<typeof setTimeout>
  let seen = `${Math.round(stage.clientWidth)}x${Math.round(stage.clientHeight)}`
  const observer = new ResizeObserver(([entry]) => {
    const size = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`
    if (size === seen) return
    seen = size
    reflow()
    clearTimeout(settle)
    settle = setTimeout(() => {
      forget()
      void show(current)
    }, 180)
  })
  observer.observe(stage)

  void boot()

  return {
    show: (page: number) => void show(page),
    destroy: () => {
      disposed = true
      clearTimeout(settle)
      observer.disconnect()
      for (const entry of inflight.values()) entry.cancel()
      forget()
      lastPage = null
      void doc?.destroy?.()
      doc = null
    },
  }
}
