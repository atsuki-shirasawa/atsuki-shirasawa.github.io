import { posts } from '../data/content'
import { profile } from '../data/profile'
import { textLang } from '../lib/lang'
import type { PostSite } from '../types'
import { QiitaIcon, ZennIcon } from './icons/BrandIcons'
import styles from './Writing.module.css'

/** サイト名からブランドアイコンを引く */
function SiteIcon({ site, size }: { site: PostSite; size: number }) {
  return site === 'Zenn' ? <ZennIcon size={size} /> : <QiitaIcon size={size} />
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
            <a
              className={`tap ${styles.profile}`}
              data-site={entry.site}
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              key={entry.site}
            >
              <SiteIcon site={entry.site} size={13} />
              {entry.label} ↗
            </a>
          ))}
        </div>
      </div>

      <ul className={styles.list}>
        {ordered.map((post) => (
          <li className={styles.row} key={post.url}>
            <span className={`mono ${styles.date}`}>{post.date}</span>
            <a className={`tap ${styles.link}`} href={post.url} target="_blank" rel="noreferrer">
              <span className={styles.mark} data-site={post.site} aria-hidden="true">
                <SiteIcon site={post.site} size={13} />
              </span>
              <span className={styles.title} lang={textLang(post.title)}>
                {post.title}
              </span>
              {/* アイコンは読み上げないので、媒体は言葉でも渡す */}
              <span className="visually-hidden">on {post.site}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
