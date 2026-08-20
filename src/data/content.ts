// scripts/fetch-content.mjs が生成した JSON を型付きで公開する。
// 生成物はコミットされているので、取得に失敗してもビルドは直前の内容で通る。
import generated from './generated.json'
import type { GeneratedContent } from '../types'

export const content = generated as GeneratedContent

export const { posts, github } = content
