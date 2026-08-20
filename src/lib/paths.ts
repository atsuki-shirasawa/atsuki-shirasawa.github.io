// GitHub Pages のプロジェクトサイトでは base が /atsuki-shirasawa/ になる。
// 静的ファイルの URL を文字列で組み立てず、必ずここを通す。
const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export function withBase(pathname: string): string {
  return `${base}/${pathname.replace(/^\//, '')}`
}

/** 1 ページ目の静止画（幅 1600px）。カードの絵であり、pdf.js が描くまでの表示 */
export const posterImage = (slug: string) => withBase(`decks/${slug}/p-1.webp`)
/** サムネイル（幅 480px） */
export const thumbImage = (slug: string, page: number) => withBase(`decks/${slug}/t-${page}.webp`)
/** 同じものの、ページ番号をクライアント側で埋める形 */
export const thumbTemplate = (slug: string) => withBase(`decks/${slug}/t-{page}.webp`)
export const pdfPath = (slug: string) => withBase(`decks/${slug}/slides.pdf`)

/** 検索が始まったときに読み込むスライド本文 */
export const searchIndexPath = () => withBase('decks-search.json')

/** build-decks.mjs が public/pdfjs/ に置く pdf.js のランタイムデータ。どちらも末尾のスラッシュが要る */
export const cMapPath = () => withBase('pdfjs/cmaps/')
export const standardFontPath = () => withBase('pdfjs/standard_fonts/')
