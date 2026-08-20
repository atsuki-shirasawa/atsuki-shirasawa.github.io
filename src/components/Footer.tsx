import { currentYear } from '../lib/time'

export default function Footer() {
  return (
    <footer className="border-t border-line px-8 py-7 text-center text-note text-faint">
      © {currentYear} Atsuki Shirasawa — Built with GitHub Pages
    </footer>
  )
}
