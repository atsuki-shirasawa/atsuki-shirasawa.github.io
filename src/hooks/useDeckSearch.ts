import { useEffect, useMemo, useRef, useState } from 'react'
import { deckHaystack, decks } from '../data/decks'
import { searchIndexPath } from '../lib/paths'
import type { Deck } from '../types'

type SearchEntry = { slug: string; text: string }

/**
 * 一覧の絞り込み。タイトル・イベント名・タグは同梱のメタデータで足りるが、
 * スライド本文は別ファイルなので、最初の検索が始まってから取りに行く。
 */
export function useDeckSearch(query: string, activeTag: string): Deck[] {
  /** スライド本文。読み込み前は null */
  const [fullText, setFullText] = useState<Map<string, string> | null>(null)
  const loading = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (query.trim() === '' || loading.current) return
    loading.current = fetch(searchIndexPath())
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status))),
      )
      .then((entries: SearchEntry[]) => {
        setFullText(new Map(entries.map((entry) => [entry.slug, entry.text.toLowerCase()])))
      })
      .catch(() => {
        // 本文が読めなくても、タイトルとタグの検索は続けられる
        setFullText(new Map())
      })
  }, [query])

  return useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return decks.filter((deck) => {
      if (activeTag && !deck.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase())) {
        return false
      }
      if (words.length === 0) return true
      const meta = deckHaystack(deck)
      const body = fullText?.get(deck.slug) ?? ''
      return words.every((word) => meta.includes(word) || body.includes(word))
    })
  }, [query, activeTag, fullText])
}
