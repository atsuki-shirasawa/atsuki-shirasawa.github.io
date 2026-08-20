import { useState } from 'react'
import ExternalLink from './ExternalLink'
import YouTubeThumb from './YouTubeThumb'
import { PlayIcon } from './icons/UiIcons'
import { watchUrl } from '../lib/video'
import type { DeckVideo } from '../types'
import styles from './VideoEmbed.module.css'

type Props = {
  video: DeckVideo
  /** サムネイルの alt と iframe の title に使う */
  title: string
}

/**
 * 再生するまで YouTube のプレイヤーを読み込まない。iframe をいきなり置くと
 * ページを開いただけで数百 KB とクッキーが付いてくるので、まずはサムネイルだけ出す。
 * 再生後は cookie を置かない nocookie ドメインを使う。
 */
export default function VideoEmbed({ video, title }: Props) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <div className={styles.frame}>
        <iframe
          className={styles.player}
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
    <div className={styles.frame}>
      <button
        className={styles.facade}
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play the talk video for ${title}`}
      >
        <YouTubeThumb id={video.id} className={styles.thumb} />
        <span className={styles.play} aria-hidden="true">
          <PlayIcon />
        </span>
      </button>
      <ExternalLink className={styles.external} href={watchUrl(video)}>
        Watch on YouTube ↗
      </ExternalLink>
    </div>
  )
}
