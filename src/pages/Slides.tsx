import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DeckCard from '../components/DeckCard'
import { deckHaystack, decks, tagIndex } from '../data/decks'
import { searchIndexPath } from '../lib/paths'
import styles from './Slides.module.css'

type SearchEntry = { slug: string; text: string }

/** これを下回るあいだは検索とタグを畳んでおく */
const CONTROLS_MIN_DECKS = 4

export default function Slides() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const activeTag = params.get('tag') ?? ''

  /** スライド本文。最初の検索が始まるまで読みに行かない */
  const [fullText, setFullText] = useState<Map<string, string> | null>(null)
  const loading = useRef<Promise<void> | null>(null)

  useEffect(() => {
    document.title = 'Slides — Atsuki Shirasawa'
  }, [])

  useEffect(() => {
    if (query.trim() === '' || loading.current) return
    loading.current = fetch(searchIndexPath())
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((entries: SearchEntry[]) => {
        setFullText(new Map(entries.map((entry) => [entry.slug, entry.text.toLowerCase()])))
      })
      .catch(() => {
        // 本文が読めなくても、タイトルとタグの検索は続けられる
        setFullText(new Map())
      })
  }, [query])

  const tags = useMemo(() => tagIndex(), [])

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return decks.filter((deck) => {
      if (activeTag && !deck.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase())) return false
      if (words.length === 0) return true
      const meta = deckHaystack(deck)
      const body = fullText?.get(deck.slug) ?? ''
      return words.every((word) => meta.includes(word) || body.includes(word))
    })
  }, [query, activeTag, fullText])

  const update = (next: { q?: string; tag?: string }) => {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }
    setParams(merged, { replace: true })
  }

  const filtered = query.trim() !== '' || activeTag !== ''
  /**
   * 数えるほどしかないうちは検索もタグも要らない。一覧を見れば済む。
   * Home のタグから ?tag= 付きで来たときは絞り込みが効いたままなので、
   * 下の件数表示と Clear はここが閉じていても出す
   */
  const showControls = decks.length >= CONTROLS_MIN_DECKS

  return (
    <div className="container">
      <section className={styles.head}>
        <h1 className={styles.title}>Slides</h1>
        <p className={styles.lead}>
          Talks from meetups, conferences and internal lightning talks. Every deck opens in the
          browser — text stays selectable and links stay live — and search looks inside the slides,
          not just the titles.
        </p>

        {showControls && (
          <div className={styles.controls}>
            <div className={styles.searchBox}>
              <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.6-3.6" />
              </svg>
              <input
                className={styles.search}
                type="search"
                value={query}
                placeholder="Search titles, tags and slide text"
                aria-label="Search slides"
                onChange={(event) => update({ q: event.target.value })}
              />
            </div>

            {tags.length > 0 && (
              <div className={styles.tags}>
                {tags.map(({ tag, count }) => (
                  <button
                    className={`mono ${styles.tag}`}
                    type="button"
                    key={tag}
                    aria-pressed={tag.toLowerCase() === activeTag.toLowerCase()}
                    onClick={() =>
                      update({ tag: tag.toLowerCase() === activeTag.toLowerCase() ? '' : tag })
                    }
                  >
                    {tag}
                    <span className={styles.tagCount}>{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {filtered && (
          <p className={`mono ${styles.status}`} aria-live="polite">
            {results.length} {results.length === 1 ? 'result' : 'results'}
            {activeTag && ` / tag: ${activeTag}`}
            <button className={`tap ${styles.clear}`} type="button" onClick={() => update({ q: '', tag: '' })}>
              Clear
            </button>
          </p>
        )}
      </section>

      {results.length === 0 ? (
        <p className={styles.empty}>
          {decks.length === 0 ? 'No decks published yet.' : 'No decks matched your search.'}
        </p>
      ) : (
        <div className={styles.grid}>
          {results.map((deck, index) => (
            <DeckCard
              deck={deck}
              key={deck.slug}
              eager={index < 2}
              onTagClick={(tag) => update({ tag })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
