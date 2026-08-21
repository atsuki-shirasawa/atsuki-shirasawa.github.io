import { useMemo } from 'react'
import DeckCard from '../components/DeckCard'
import { SearchIcon } from '../components/icons/UiIcons'
import { decks, tagIndex } from '../data/decks'
import { useDeckSearch } from '../hooks/useDeckSearch'
import { usePageTitle } from '../hooks/usePageTitle'
import { useQueryUpdate } from '../hooks/useQueryUpdate'

/** これを下回るあいだは検索とタグを畳んでおく */
const CONTROLS_MIN_DECKS = 4

export default function Slides() {
  const [params, update] = useQueryUpdate()
  const query = params.get('q') ?? ''
  const activeTag = params.get('tag') ?? ''

  usePageTitle('Slides — Atsuki Shirasawa')

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
    <div className="wrap">
      <section className="flex flex-col gap-4 pt-18 pb-10 max-narrow:pt-12 max-narrow:pb-8">
        <h1 className="display-title text-display-xl font-bold max-narrow:text-display-md">
          Slides
        </h1>
        <p className="max-w-[680px] text-lead leading-prose text-pretty text-muted">
          Talks from meetups, conferences and internal lightning talks. Every deck opens in the
          browser — text stays selectable and links stay live — and search looks inside the slides,
          not just the titles.
        </p>

        {showControls && (
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="relative flex-[1_1_280px] max-w-[360px] max-narrow:max-w-none">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 fill-none stroke-faint stroke-2" />
              <input
                // outline は base の :focus-visible に任せる。outline-none を置くと、残るのが
                // 1px の枠線色だけになり、ページ中でここだけフォーカスが見えなくなる
                className="w-full rounded-lg border border-line bg-surface py-2.5 pr-3.5 pl-9 text-body text-fg placeholder:text-faint focus:border-accent"
                type="search"
                value={query}
                placeholder="Search titles, tags and slide text"
                aria-label="Search slides"
                onChange={(event) => update({ q: event.target.value })}
              />
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pointer-coarse:gap-2.5">
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
                    {/*
                      件数は opacity で落とせない。ホバー時はラベル自身が 4.96:1
                      しかなく、そこから何 % 落としても 4.5:1 を割る（55% で 2.26:1）。
                      状態で変わらない --muted に固定する（6 状態の最悪 4.76:1）。
                    */}
                    <span className="text-muted">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {filtered && (
          <p className="font-mono flex items-center gap-3 text-note text-faint" aria-live="polite">
            {results.length} {results.length === 1 ? 'result' : 'results'}
            {activeTag && ` / tag: ${activeTag}`}
            <button
              className="tap cursor-pointer p-0 text-note text-accent underline"
              type="button"
              onClick={() => update({ q: '', tag: '' })}
            >
              Clear
            </button>
          </p>
        )}
      </section>

      {results.length === 0 ? (
        <p className="py-8 text-body text-muted">
          {decks.length === 0 ? 'No decks published yet.' : 'No decks matched your search.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 max-narrow:grid-cols-1">
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
