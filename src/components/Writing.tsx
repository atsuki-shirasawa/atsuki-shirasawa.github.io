import ExternalLink from './ExternalLink'
import { posts } from '../data/content'
import { profile } from '../data/profile'
import { textLang } from '../lib/lang'
import type { PostSite } from '../types'
import { QiitaIcon, ZennIcon } from './icons/BrandIcons'

/**
 * 媒体を示す唯一の色。アイコンだけが持ち、文字はホバーでそれに寄る。
 * data 属性で CSS から引くのをやめ、色の出どころを媒体の隣に置いた。
 */
const siteColor: Record<PostSite, { icon: string; hover: string }> = {
  Zenn: { icon: 'text-zenn', hover: 'hover:text-zenn-fg' },
  Qiita: { icon: 'text-qiita', hover: 'hover:text-qiita-fg' },
}

/** サイト名からブランドアイコンを引く */
function SiteIcon({ site, size, className }: { site: PostSite; size: number; className?: string }) {
  const Icon = site === 'Zenn' ? ZennIcon : QiitaIcon
  return <Icon size={size} className={className} />
}

const authorProfiles: { site: PostSite; label: string; url: string }[] = [
  { site: 'Zenn', label: 'zenn.dev/atsukish', url: profile.links.zenn },
  { site: 'Qiita', label: 'qiita.com/atsukish', url: profile.links.qiita },
]

export default function Writing() {
  // 媒体で分けず、書いた順に一本で並べる。この節の並びの意味は時系列
  const ordered = [...posts].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">WRITING</h2>
        <div className="section-links">
          {authorProfiles.map((entry) => (
            <ExternalLink
              className={`tap inline-flex items-center gap-1.75 whitespace-nowrap text-note text-muted transition-colors hover:no-underline ${siteColor[entry.site].hover}`}
              href={entry.url}
              key={entry.site}
            >
              <SiteIcon site={entry.site} size={13} className={siteColor[entry.site].icon} />
              {entry.label} ↗
            </ExternalLink>
          ))}
        </div>
      </div>

      {/* 左列の幅は CAREER と TECH STACK と同じ section-row が持つ。行の骨格を揃える */}
      <ul>
        {ordered.map((post) => (
          <li className="section-row py-3 max-narrow:gap-1" key={post.url}>
            <span className="font-mono pt-0.75 text-note tabular-nums text-faint max-narrow:pt-0">
              {post.date}
            </span>
            <ExternalLink
              className="tap group grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2.5 text-fg hover:no-underline"
              href={post.url}
            >
              {/* svg の行送りぶんを消してアイコンを文字のベースラインに合わせる */}
              <span
                className={`inline-flex translate-y-0.5 leading-[0] ${siteColor[post.site].icon}`}
                aria-hidden="true"
              >
                <SiteIcon site={post.site} size={13} />
              </span>
              <span
                className="text-body leading-prose text-pretty transition-colors group-hover:text-accent"
                lang={textLang(post.title)}
              >
                {post.title}
              </span>
              {/* アイコンは読み上げないので、媒体は言葉でも渡す */}
              <span className="visually-hidden">on {post.site}</span>
            </ExternalLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
