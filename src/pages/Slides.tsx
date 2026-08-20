import { useEffect, useMemo } from 'react'
import DeckCard from '../components/DeckCard'
import { SearchIcon } from '../components/icons/UiIcons'
import { decks, tagIndex } from '../data/decks'
import { useDeckSearch } from '../hooks/useDeckSearch'
import { useQueryUpdate } from '../hooks/useQueryUpdate'
import styles from './Slides.module.css'

/** これを下回るあいだは検索とタグを畳んでおく */
const CONTROLS_MIN_DECKS = 4

export default function Slides() {
  const [params, update] = useQueryUpdate()
  const query = params.get('q') ?? ''
  const activeTag = params.get('tag') ?? ''

  useEffect(() => {
    document.title = 'Slides — Atsuki Shirasawa'
  }, [])

  const tags = useMemo(() => tagIndex(), [])
  const results = useDeckSearch(query, activeTag)

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
              <SearchIcon className={styles.searchIcon} />
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
                    className="chip"
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
            <button
              className={`tap ${styles.clear}`}
              type="button"
              onClick={() => update({ q: '', tag: '' })}
            >
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
