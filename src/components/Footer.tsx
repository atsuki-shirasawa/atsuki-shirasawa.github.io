import { currentYear } from '../lib/time'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      © {currentYear} Atsuki Shirasawa — Built with GitHub Pages
    </footer>
  )
}
