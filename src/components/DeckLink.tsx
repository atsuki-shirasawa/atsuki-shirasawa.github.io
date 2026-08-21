import { Link } from 'react-router-dom'
import ExternalLink from './ExternalLink'
import { deckView, type DeckView } from '../lib/deckView'
import type { Deck } from '../types'
import type { ReactNode } from 'react'

type Props = {
  deck: Deck
  /**
   * 判定済みの見せ方。呼ぶ側が自分でも要るときは渡す（DeckCard は行き先と
   * カードの絵の両方で使うので、渡さないと hostOf の new URL() まで 2 回走る）。
   * 既定引数なので、要らない側の呼び方は変わらない。
   */
  view?: DeckView
  className?: string
  children: ReactNode
}

/**
 * デッキを押したときの飛び先。よそに実体があるもの（配布元の PDF、録画だけの
 * YouTube）はそのまま外へ、自前のスライドだけがこちらのビューアへ向かう。
 */
export default function DeckLink({ deck, view = deckView(deck), className, children }: Props) {
  if (view.kind === 'viewer') {
    return (
      <Link className={className} to={`/slides/${deck.slug}`}>
        {children}
      </Link>
    )
  }
  return (
    <ExternalLink className={className} href={view.url}>
      {children}
    </ExternalLink>
  )
}
