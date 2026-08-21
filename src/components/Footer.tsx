import { profile } from '../data/profile'
import { currentYear } from '../lib/time'

export default function Footer() {
  return (
    <footer className="border-t border-t-line px-8 py-7 text-center text-note text-faint">
      © {currentYear} {profile.name} — Built with GitHub Pages
    </footer>
  )
}
