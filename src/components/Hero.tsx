import { Link } from 'react-router-dom'
import CareerTrack from './CareerTrack'
import ExternalLink from './ExternalLink'
import { github } from '../data/content'
import { profile } from '../data/profile'
import { QiitaIcon, ZennIcon } from './icons/BrandIcons'

/** 3 つのボタンの共通の箱。padding は指で押せる 44px に乗せる高さ */
const BUTTON =
  'inline-flex items-center gap-2 rounded-lg border px-4.5 py-2.75 text-body font-semibold transition-colors hover:no-underline'

/** 従。地色を持たせず、罫線と抑えた文字色で主より一段落とす */
const BUTTON_OUTLINE = `${BUTTON} border-line bg-transparent text-muted`

export default function Hero() {
  return (
    <section className="flex flex-col gap-14 pt-22 pb-14 max-wide:gap-11 max-narrow:gap-8 max-narrow:pt-14 max-narrow:pb-10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-12 max-wide:gap-8 max-narrow:grid-cols-1 max-narrow:justify-items-start max-narrow:gap-5.5">
        <div className="flex flex-col gap-4.5">
          <p className="font-mono text-label tracking-caps text-accent">{profile.eyebrow}</p>
          {/* ページで唯一ディスプレイ書体を張る場所。準拡張の字面で標識の見出しに寄せる */}
          <h1 className="display-title text-display-3xl font-bold max-wide:text-display-2xl max-narrow:text-display-lg">
            {profile.name}
          </h1>
          {/* 主張の 2 文。ここが読まれれば用は足りる */}
          <p className="max-w-[620px] text-display-xs leading-lead text-pretty text-fg max-narrow:text-display-2xs">
            {profile.lead}
          </p>
          <p className="max-w-[560px] text-body leading-prose text-pretty text-muted">
            {profile.support}
          </p>
        </div>

        {github.avatarUrl && (
          <ExternalLink
            className="group inline-flex shrink-0 rounded-full leading-[0] hover:no-underline max-narrow:-order-1"
            href={profile.links.github}
            title={`github.com/${github.login}`}
          >
            <img
              className="size-[200px] rounded-full border border-line bg-chipbg object-cover transition-[border-color,translate] duration-200 group-hover:-translate-y-0.5 group-hover:border-accent max-wide:size-[150px] max-narrow:size-[104px]"
              src={github.avatarUrl}
              alt={`${profile.name}'s GitHub avatar`}
              width={200}
              height={200}
            />
          </ExternalLink>
        )}
      </div>

      <CareerTrack />

      <div className="flex flex-wrap gap-3">
        {/* 主。塗りはこの 1 つだけに使う */}
        <Link className={`${BUTTON} solid-accent border-accent hover:border-accent2`} to="/slides">
          Slides <span aria-hidden="true">→</span>
        </Link>
        {/* 従の 2 つ。差はアイコンの色と、ホバー時の枠線・文字色だけ */}
        <ExternalLink
          className={`${BUTTON_OUTLINE} hover:border-zenn hover:text-zenn-fg`}
          href={profile.links.zenn}
        >
          <ZennIcon size={15} className="shrink-0 text-zenn" />
          Zenn
        </ExternalLink>
        <ExternalLink
          className={`${BUTTON_OUTLINE} hover:border-qiita hover:text-qiita-fg`}
          href={profile.links.qiita}
        >
          <QiitaIcon size={15} className="shrink-0 text-qiita" />
          Qiita
        </ExternalLink>
      </div>
    </section>
  )
}
