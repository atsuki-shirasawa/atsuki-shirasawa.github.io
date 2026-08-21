// scripts/fetch-content.mjs が生成した JSON を型付きで公開する。
// 生成物はコミットされているので、取得に失敗してもビルドは直前の内容で通る。
import generated from './generated.json'
import type { GeneratedContent } from '../types'

const content = generated as GeneratedContent

export const { github } = content

/**
 * 記事。媒体で分けず、書いた順（新しい順）に一本で並べる — WRITING の並びの意味は
 * 時系列。同月の記事どうしの前後は fetch-content.mjs が日時で決めた順のまま
 * （Array#sort は安定なので保たれる）。
 */
export const posts = [...content.posts].sort((a, b) => b.date.localeCompare(a.date))
