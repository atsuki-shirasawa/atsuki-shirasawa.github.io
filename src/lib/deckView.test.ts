import { describe, expect, it } from 'vitest'
import { aspectStyle, deckView, formatDeckDate, hostOf, previewPages } from './deckView'
import type { Deck, DeckVideo } from '../types'

const video = (id: string, start = 0): DeckVideo => ({ provider: 'youtube', id, start })

const deck = (over: Partial<Deck> = {}): Deck => ({
  slug: 'a-talk',
  title: 'A talk',
  date: '2026-07-30',
  event: null,
  speaker: null,
  description: '',
  tags: [],
  links: [],
  video: null,
  source: null,
  format: 'pdf',
  pageCount: 12,
  aspect: 1.7778,
  ...over,
})

describe('deckView', () => {
  it('自前のスライドはこちらのビューアで開く', () => {
    expect(deckView(deck())).toEqual({ kind: 'viewer' })
    expect(deckView(deck({ format: 'marp' }))).toEqual({ kind: 'viewer' })
  })

  it('自前のスライドに録画が付いていても、主役はビューアのまま', () => {
    expect(deckView(deck({ video: video('abcdefghijk') }))).toEqual({ kind: 'viewer' })
  })

  it('よそが配っている資料は配布元へ送る', () => {
    expect(deckView(deck({ source: 'https://www.example.com/deck.pdf' }))).toEqual({
      kind: 'away',
      url: 'https://www.example.com/deck.pdf',
      host: 'example.com',
    })
  })

  it('録画だけの登壇は YouTube へ送る', () => {
    const view = deckView(deck({ format: 'video', pageCount: 0, video: video('abcdefghijk') }))
    expect(view).toMatchObject({
      kind: 'video',
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
      host: 'youtube.com',
    })
  })

  it('開始位置があれば連れていく', () => {
    const view = deckView(deck({ format: 'video', pageCount: 0, video: video('abcdefghijk', 90) }))
    expect(view).toMatchObject({ url: 'https://www.youtube.com/watch?v=abcdefghijk&t=90s' })
  })

  // カードと詳細で判断がずれないよう、優先順位はここ 1 箇所で決まっている
  it('借りものの判定が録画より先に来る', () => {
    const view = deckView(
      deck({ format: 'video', source: 'https://example.com/x.pdf', video: video('abcdefghijk') }),
    )
    expect(view.kind).toBe('away')
  })
})

describe('hostOf', () => {
  it('見せるための名前なので www. は落とす', () => {
    expect(hostOf('https://www.speakerdeck.com/a/b')).toBe('speakerdeck.com')
    expect(hostOf('https://services.google.com/fh/files/x.pdf')).toBe('services.google.com')
  })

  it('URL として読めないものはそのまま返す（ホスト名の代わりに出す）', () => {
    expect(hostOf('not a url')).toBe('not a url')
    expect(hostOf('')).toBe('')
  })
})

describe('previewPages', () => {
  it('自前のスライドは先頭 4 枚まで', () => {
    expect(previewPages(deck({ pageCount: 12 }), { kind: 'viewer' })).toEqual([1, 2, 3, 4])
  })

  it('4 枚に足りなければあるぶんだけ', () => {
    expect(previewPages(deck({ pageCount: 2 }), { kind: 'viewer' })).toEqual([1, 2])
    expect(previewPages(deck({ pageCount: 1 }), { kind: 'viewer' })).toEqual([1])
  })

  it('借りものは表紙だけ（こちらに 1 枚しか無い）', () => {
    const away = { kind: 'away', url: 'https://example.com/x.pdf', host: 'example.com' } as const
    expect(previewPages(deck({ pageCount: 33 }), away)).toEqual([1])
  })
})

describe('formatDeckDate', () => {
  it('区切りを点に替える', () => {
    expect(formatDeckDate('2026-07-30')).toBe('2026.07.30')
  })

  it('日付が無いデッキは空文字（要素を出さない側で判断する）', () => {
    expect(formatDeckDate(null)).toBe('')
  })
})

describe('aspectStyle', () => {
  it('CSS の aspect-ratio は数値を文字列で受ける', () => {
    expect(aspectStyle(1.7778)).toEqual({ aspectRatio: '1.7778' })
    expect(aspectStyle(1)).toEqual({ aspectRatio: '1' })
  })
})
