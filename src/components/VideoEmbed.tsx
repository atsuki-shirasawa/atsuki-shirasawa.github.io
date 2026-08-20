import { useState } from 'react'
import ExternalLink from './ExternalLink'
import YouTubeThumb from './YouTubeThumb'
import { PlayIcon } from './icons/UiIcons'
import { watchUrl } from '../lib/video'
import type { DeckVideo } from '../types'

type Props = {
  video: DeckVideo
  /** サムネイルの alt と iframe の title に使う */
  title: string
}

/** 埋め込みとサムネイルで同じ枠に収める */
const SURFACE = 'block aspect-video w-full overflow-hidden rounded-xl bg-chipbg'

/**
 * 再生するまで YouTube のプレイヤーを読み込まない。iframe をいきなり置くと
 * ページを開いただけで数百 KB とクッキーが付いてくるので、まずはサムネイルだけ出す。
 * 再生後は cookie を置かない nocookie ドメインを使う。
 */
export default function VideoEmbed({ video, title }: Props) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <div className="relative flex flex-col gap-2">
        <iframe
          className={`${SURFACE} border-0`}
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0${
            video.start ? `&start=${video.start}` : ''
          }`}
          title={`${title} — talk video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-2">
      <button
        className={`${SURFACE} lift group relative cursor-pointer p-0`}
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play the talk video for ${title}`}
      >
        <YouTubeThumb id={video.id} className="block size-full object-cover" />
        <span
          className="absolute top-1/2 left-1/2 flex size-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-glass shadow-float backdrop-blur-sm transition-[background,scale] duration-200 group-hover:scale-106 group-hover:bg-accent"
          aria-hidden="true"
        >
          {/* 三角形の重心はやや左に寄るので、光学的に中央へ寄せる */}
          <PlayIcon className="size-[30px] translate-x-0.5 fill-on-media" />
        </span>
      </button>
      <ExternalLink className="self-end font-mono text-note" href={watchUrl(video)}>
        Watch on YouTube ↗
      </ExternalLink>
    </div>
  )
}
