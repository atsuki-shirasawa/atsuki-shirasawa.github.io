import ExternalLink from './ExternalLink'
import { posts } from '../data/content'
import { textLang } from '../lib/lang'
import { SITE_ORDER, SITES } from './sites'

export default function Writing() {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">WRITING</h2>
        {/* 箱（並べ方・アイコンとの間隔・rest の色）は .section-links が持つ */}
        <div className="section-links">
          {SITE_ORDER.map((site) => {
            const { Icon, url, handle, icon, hover } = SITES[site]
            return (
              <ExternalLink className={`tap text-muted ${hover}`} href={url} key={site}>
                <Icon size={13} className={icon} />
                {handle} ↗
              </ExternalLink>
            )
          })}
        </div>
      </div>

      {/* 左列の幅は CAREER と TECH STACK と同じ section-row が持つ。行の骨格を揃える */}
      <ul>
        {posts.map((post) => {
          const { Icon, icon } = SITES[post.site]
          return (
            <li className="section-row py-3 max-narrow:gap-1" key={post.url}>
              <span className="font-mono pt-0.75 text-note tabular-nums text-faint max-narrow:pt-0">
                {post.date}
              </span>
              <ExternalLink
                className="tap group grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2.5 text-fg hover:no-underline"
                href={post.url}
              >
                {/* svg の行送りぶんを消してアイコンを文字のベースラインに合わせる */}
                <span className={`inline-flex translate-y-0.5 leading-[0] ${icon}`} aria-hidden="true">
                  <Icon size={13} />
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
          )
        })}
      </ul>
    </section>
  )
}
