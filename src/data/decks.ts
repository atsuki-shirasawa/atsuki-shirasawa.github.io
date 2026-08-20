// decks/<slug>/index.md から scripts/build-decks.mjs が生成したメタデータ。
// スライド本文（検索用テキスト）は public/decks-search.json 側にあり、
// 検索が始まったときだけ取りに行く。
import generated from './decks.json'
import { watchUrl } from '../lib/video'
import type { Deck } from '../types'

/** 新しい順（並び順は build-decks.mjs が決めている） */
export const decks: Deck[] = (generated as { decks: Deck[] }).decks

export function deckBySlug(slug: string): Deck | undefined {
  return decks.find((deck) => deck.slug === slug)
}

/** 前後のデッキ。一覧が新しい順なので index + 1 が「ひとつ前の登壇」 */
export function deckNeighbours(slug: string) {
  const index = decks.findIndex((deck) => deck.slug === slug)
  if (index === -1) return { older: undefined, newer: undefined }
  return { older: decks[index + 1], newer: decks[index - 1] }
}

/** タグを使用数の多い順に */
export function tagIndex(): { tag: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>()
  for (const deck of decks) {
    for (const tag of deck.tags) {
      const key = tag.toLowerCase()
      const entry = counts.get(key)
      if (entry) entry.count += 1
      else counts.set(key, { tag, count: 1 })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** 2026-07-30 を 2026.07.30 に */
export function formatDeckDate(date: string | null): string {
  if (!date) return ''
  return date.replaceAll('-', '.')
}

/**
 * カードを押したときの外部の飛び先。よそが配っている資料はその配布元へ、
 * スライドが無く録画だけの登壇は YouTube へ送る。自前のスライドを持つ
 * デッキだけが null になり、こちらのビューアで開く
 */
export function deckAway(deck: Deck): string | null {
  if (deck.source) return deck.source
  if (deck.format === 'video' && deck.video) return watchUrl(deck.video)
  return null
}

/** 見せるためのホスト名。www. は落とす */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** カードのめくりプレビューに使うページ（最大 4 枚）。借りものの資料は表紙だけ */
export function previewPages(deck: Deck): number[] {
  const shown = deck.source ? 1 : Math.min(deck.pageCount, 4)
  return Array.from({ length: shown }, (_, index) => index + 1)
}

/** 検索対象にする、本文以外のテキスト */
export function deckHaystack(deck: Deck): string {
  return [deck.title, deck.event ?? '', deck.speaker ?? '', deck.description, deck.tags.join(' ')]
    .join(' ')
    .toLowerCase()
}
