import { NavLink } from 'react-router-dom'
import ExternalLink from './ExternalLink'
import { profile } from '../data/profile'
import { GitHubIcon } from './icons/BrandIcons'
import { MoonIcon, SlidesIcon, SunIcon } from './icons/UiIcons'
import styles from './Header.module.css'

type Props = {
  isDark: boolean
  onToggleTheme: () => void
}

export default function Header({ isDark, onToggleTheme }: Props) {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `tap ${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <NavLink to="/" className={`tap ${styles.logo}`}>
          <span className={styles.logoMark} aria-hidden="true" />
          {profile.siteName}
        </NavLink>
        <nav className={styles.nav}>
          <NavLink to="/" className={navClass} end>
            Home
          </NavLink>
          <NavLink to="/slides" className={navClass}>
            <SlidesIcon size={14} />
            Slides
          </NavLink>
          <ExternalLink className={`tap ${styles.navExternal}`} href={profile.links.github}>
            <GitHubIcon size={14} />
            GitHub ↗
          </ExternalLink>
          <button
            type="button"
            className={`tap ${styles.themeToggle}`}
            onClick={onToggleTheme}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </nav>
      </div>
    </header>
  )
}
