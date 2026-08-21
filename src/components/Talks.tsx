import { Link } from 'react-router-dom'
import Carousel from './Carousel'
import DeckCard from './DeckCard'
import { decks } from '../data/decks'

export default function Talks() {
  if (decks.length === 0) return null

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">TALKS</h2>
        <div className="section-links">
          <Link className="tap text-muted hover:text-accent" to="/slides">
            All talks <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <Carousel name="Talks">
        {decks.map((deck, index) => (
          <li key={deck.slug}>
            <DeckCard deck={deck} eager={index < 2} />
          </li>
        ))}
      </Carousel>
    </section>
  )
}
