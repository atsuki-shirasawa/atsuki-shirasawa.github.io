// デッキの見せ方は 3 通りしかない。format / source / video の組み合わせから毎回
// 組み立て直すと、カードと詳細で判断がずれる（実際 videoOnly と away の 2 変数を
// 4 箇所で別々に復元していた）。ここで 1 度だけ決めて、あとは kind で分岐する。
import { watchUrl } from './video'
import type { Deck, DeckVideo } from '../types'

/** カードのめくりプレビューに出す最大枚数 */
const PREVIEW_PAGES = 4

export type DeckView =
  /** 自前のスライド。pdf.js でこちらのビューアに出す */
  | { kind: 'viewer' }
  /** よそが配っている資料。こちらには表紙しか無いので配布元へ送る */
  | { kind: 'away'; url: string; host: string }
  /** スライドが無く、録画だけが残っている登壇 */
  | { kind: 'video'; url: string; host: string; video: DeckVideo }

export function deckView(deck: Deck): DeckView {
  if (deck.source) return { kind: 'away', url: deck.source, host: hostOf(deck.source) }
  if (deck.format === 'video' && deck.video) {
    const url = watchUrl(deck.video)
    return { kind: 'video', url, host: hostOf(url), video: deck.video }
  }
  // format が 'video' なのに video: が無いデッキは build-decks.mjs の readMeta が
  // 弾いているので、ここには来ない
  return { kind: 'viewer' }
}

/** 見せるためのホスト名。www. は落とす */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** カードのめくりプレビューに使うページ。借りものの資料は表紙だけ */
export function previewPages(deck: Deck, view: DeckView): number[] {
  const shown = view.kind === 'away' ? 1 : Math.min(deck.pageCount, PREVIEW_PAGES)
  return Array.from({ length: shown }, (_, index) => index + 1)
}

/** 2026-07-30 を 2026.07.30 に */
export function formatDeckDate(date: string | null): string {
  if (!date) return ''
  return date.replaceAll('-', '.')
}
