// scripts/fetch-content.mjs が生成した JSON を型付きで公開する。
// 生成物はコミットされているので、取得に失敗してもビルドは直前の内容で通る。
import generated from './generated.json'
import { readCalendar } from '../lib/contributions'
import type { GeneratedContent } from '../types'

const content = generated as GeneratedContent

export const { github } = content

/**
 * ヒートマップの読み（升目・実日・月ラベル・最新の位置）。入力は generated.json
 * なのでビルド時に決まる — 描画ごとに 53 週を畳み直す理由が無いので 1 度だけ
 * 評価する（useMemo(…, []) は依存配列が空になるだけで、何も守らない）。
 */
export const calendar = readCalendar(github.weeks)

/**
 * 記事。媒体で分けず、書いた順（新しい順）に一本で並べる — WRITING の並びの意味は
 * 時系列。同月の記事どうしの前後は fetch-content.mjs が日時で決めた順のまま
 * （Array#sort は安定なので保たれる）。
 */
export const posts = [...content.posts].sort((a, b) => b.date.localeCompare(a.date))
