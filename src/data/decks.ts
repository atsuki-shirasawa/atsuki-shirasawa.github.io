// decks/<slug>/index.md から scripts/build-decks.mjs が生成したメタデータ。
// スライド本文（検索用テキスト）は public/decks-search.json 側にあり、
// 検索が始まったときだけ取りに行く。
//
// ここは「一覧に対する問い」だけを持つ。1 件をどう見せるか（自前のビューアか、
// よその配布元か、録画だけか）は src/lib/deckView.ts。
import generated from './decks.json'
import type { Deck } from '../types'

// 形は書き出す側（scripts/decks/record.mjs）が検査してから書いているので、
// ここで信じてよい
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
function tagIndex(): { tag: string; count: number }[] {
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

/**
 * 一覧に出すタグ。入力は decks.json なのでビルド時に決まる — 描画ごとに数え直す
 * 理由が無いので 1 度だけ評価する（useMemo(…, []) は依存配列が空になるだけで、
 * 何も守らない）。
 */
export const deckTags = tagIndex()

/** 検索対象にする、本文以外のテキスト */
export function deckHaystack(deck: Deck): string {
  return [deck.title, deck.event ?? '', deck.speaker ?? '', deck.description, deck.tags.join(' ')]
    .join(' ')
    .toLowerCase()
}
