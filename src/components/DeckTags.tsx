import { Link } from 'react-router-dom'

type Props = {
  tags: string[]
  className?: string
  /**
   * 一覧の中では、その場で絞り込む。渡されなければ（Home の TALKS、詳細ページ）
   * 絞り込む相手がいないので、そのタグで絞った一覧へ送る
   */
  onTagClick?: (tag: string) => void
}

/** デッキのタグ。チップの見た目は global.css の .chip に置いてある */
export default function DeckTags({ tags, className, onTagClick }: Props) {
  if (tags.length === 0) return null

  return (
    <p className={className}>
      {tags.map((tag) =>
        onTagClick ? (
          <button className="chip" type="button" key={tag} onClick={() => onTagClick(tag)}>
            {tag}
          </button>
        ) : (
          <Link className="chip" key={tag} to={`/slides?tag=${encodeURIComponent(tag)}`}>
            {tag}
          </Link>
        ),
      )}
    </p>
  )
}
