import { useState } from 'react'

type Props = {
  id: string
  className?: string
  alt?: string
  loading?: 'eager' | 'lazy'
}

/** 動画のサムネイル。maxres が無い動画もあるので、その場合は hq に落とす */
export default function YouTubeThumb({ id, className, alt = '', loading = 'lazy' }: Props) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`)

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setSrc(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
    />
  )
}
