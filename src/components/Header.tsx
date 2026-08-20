import { NavLink } from 'react-router-dom'
import ExternalLink from './ExternalLink'
import { profile } from '../data/profile'
import { GitHubIcon } from './icons/BrandIcons'
import { MoonIcon, SlidesIcon, SunIcon } from './icons/UiIcons'

/*
 * 状態ごとに色と罫線色を書き切る。共通側に text-muted を置いて active 側で
 * text-fg を足す書き方は効かない — 同じ詳細度なので、勝つのは class 属性の
 * 並びではなく生成 CSS の並び（text-muted が後ろに出る）。
 */
const NAV_LINK = 'tap inline-flex items-center gap-1.5 border-b-2 pb-0.5 hover:text-fg hover:no-underline'

export default function Header({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean
  onToggleTheme: () => void
}) {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? `${NAV_LINK} border-b-accent text-fg`
      : `${NAV_LINK} border-b-transparent text-muted`

  return (
    <header className="sticky top-0 z-10 border-b border-b-line bg-headerbg backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between gap-4">
        <NavLink
          to="/"
          className="tap flex shrink-0 items-center gap-2.5 text-strong font-bold tracking-[0.02em] text-fg hover:text-fg hover:no-underline"
        >
          <span className="inline-block size-2.5 rounded-xs bg-accent" aria-hidden="true" />
          {profile.siteName}
        </NavLink>
        <nav className="flex items-center gap-7 text-body font-medium max-narrow:gap-4 max-narrow:text-label">
          <NavLink to="/" className={navClass} end>
            Home
          </NavLink>
          <NavLink to="/slides" className={navClass}>
            <SlidesIcon size={14} />
            Slides
          </NavLink>
          {/* 幅が足りなくなったら畳む（Hero とフッター側に導線がある） */}
          <ExternalLink
            className="tap inline-flex items-center gap-1.5 whitespace-nowrap text-muted hover:text-accent hover:no-underline max-tiny:hidden"
            href={profile.links.github}
          >
            <GitHubIcon size={14} />
            GitHub ↗
          </ExternalLink>
          <button
            type="button"
            className="tap flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-fg hover:border-accent hover:text-accent"
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
