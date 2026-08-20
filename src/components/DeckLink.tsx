import { Link } from 'react-router-dom'
import ExternalLink from './ExternalLink'
import { deckView } from '../lib/deckView'
import type { Deck } from '../types'
import type { ReactNode } from 'react'

type Props = {
  deck: Deck
  className?: string
  children: ReactNode
}

/**
 * デッキを押したときの飛び先。よそに実体があるもの（配布元の PDF、録画だけの
 * YouTube）はそのまま外へ、自前のスライドだけがこちらのビューアへ向かう。
 */
export default function DeckLink({ deck, className, children }: Props) {
  const view = deckView(deck)

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
