import { describe, expect, it } from 'vitest'
import { textLang } from './lang'

// ページ全体は lang="en"。読み上げに正しい声を選ばせるため、タイトル要素だけ
// 書いたときの言語に付け替える。

describe('textLang', () => {
  it('漢字・ひらがな・カタカナのどれかがあれば ja', () => {
    expect(textLang('検索基盤の再設計')).toBe('ja')
    expect(textLang('スライド')).toBe('ja')
    expect(textLang('しくみ')).toBe('ja')
    expect(textLang('検索')).toBe('ja')
  })

  it('英字だけなら en', () => {
    expect(textLang('How Agentic AI is Transforming the Retail Industry')).toBe('en')
    expect(textLang('')).toBe('en')
    expect(textLang('2026-07-30')).toBe('en')
  })

  it('混ざっていれば ja（読み上げは日本語の声で読む方が通じる）', () => {
    expect(textLang('GitHub Pages でスライドを共有する')).toBe('ja')
    expect(textLang('LangGraph で作るエージェント')).toBe('ja')
  })
})
