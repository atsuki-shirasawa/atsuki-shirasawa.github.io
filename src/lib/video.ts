import type { DeckVideo } from '../types'

/** 埋め込みではなく YouTube 本体で開くための URL。開始位置があれば連れていく */
export function watchUrl(video: DeckVideo): string {
  return `https://www.youtube.com/watch?v=${video.id}${video.start ? `&t=${video.start}s` : ''}`
}
