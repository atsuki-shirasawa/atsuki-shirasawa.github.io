import { describe, expect, it, vi } from 'vitest'

import { normalizeDate, normalizeLinks, normalizeTags, normalizeVideo, parseStart } from './meta.mjs'

// 入力は人が手で書く YAML。gray-matter は日付を Date にしたり、値が 1 つなら
// 配列にしなかったりするので、受け口が広い。ここが readMeta 経由でしか
// 触れないと、分岐のほとんどを一度も通せない。

describe('normalizeDate', () => {
  it('YAML が Date を返しても UTC で日付が動かない', () => {
    // JST で書いた 2026-07-30 が 07-29 にずれないこと
    expect(normalizeDate(new Date('2026-07-30T00:00:00Z'))).toBe('2026-07-30')
  })

  it('0 埋めしていない月日を揃える', () => {
    expect(normalizeDate('2026-7-5')).toBe('2026-07-05')
    expect(normalizeDate('2026/7/5')).toBe('2026-07-05')
  })

  it('すでに揃っているものはそのまま', () => {
    expect(normalizeDate('2026-07-30')).toBe('2026-07-30')
  })

  it('日付が無ければ null', () => {
    expect(normalizeDate(undefined)).toBeNull()
    expect(normalizeDate('')).toBeNull()
  })

  it('読めない書式は捨てずにそのまま通す（一覧の並びには使える）', () => {
    expect(normalizeDate('2026 summer')).toBe('2026 summer')
  })
})

describe('normalizeTags', () => {
  it('配列でもカンマ区切りでも受ける', () => {
    expect(normalizeTags(['AI Agent', 'Google Cloud'])).toEqual(['AI Agent', 'Google Cloud'])
    expect(normalizeTags('AI Agent, Google Cloud')).toEqual(['AI Agent', 'Google Cloud'])
  })

  it('大小の違いは同じタグとして 1 つにし、最初の表記を残す', () => {
    expect(normalizeTags(['Marp', 'marp', 'MARP'])).toEqual(['Marp'])
  })

  it('空要素は落とす', () => {
    expect(normalizeTags(['Marp', '', '  '])).toEqual(['Marp'])
    expect(normalizeTags(undefined)).toEqual([])
  })
})

describe('normalizeVideo', () => {
  it('watch / youtu.be / embed / live / shorts のどれでも id を取る', () => {
    const id = 'dQw4w9WgXcQ'
    for (const url of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/live/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube-nocookie.com/embed/${id}`,
    ]) {
      expect(normalizeVideo(url), url).toEqual({ provider: 'youtube', id, start: 0 })
    }
  })

  it('余分なクエリが付いていても id だけを見る', () => {
    expect(normalizeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123')).toMatchObject({
      id: 'dQw4w9WgXcQ',
    })
  })

  it('開始位置を秒に直す', () => {
    expect(normalizeVideo('https://youtu.be/dQw4w9WgXcQ?t=90')).toMatchObject({ start: 90 })
    expect(normalizeVideo('https://youtu.be/dQw4w9WgXcQ?start=42')).toMatchObject({ start: 42 })
  })

  it('{ url } の形でも受ける', () => {
    expect(normalizeVideo({ url: 'https://youtu.be/dQw4w9WgXcQ' })).toMatchObject({
      id: 'dQw4w9WgXcQ',
    })
  })

  it('無ければ null', () => {
    expect(normalizeVideo(undefined)).toBeNull()
    expect(normalizeVideo('')).toBeNull()
  })

  it('読めないものは警告して null。ビルドは落とさない', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizeVideo('これは URL ではない')).toBeNull()
    // YouTube 以外、および id が 11 文字でないもの
    expect(normalizeVideo('https://vimeo.com/123456')).toBeNull()
    expect(normalizeVideo('https://youtu.be/short')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('parseStart', () => {
  it('秒数と h/m/s の組を受ける', () => {
    expect(parseStart('90')).toBe(90)
    expect(parseStart('90s')).toBe(90)
    expect(parseStart('1m30s')).toBe(90)
    expect(parseStart('1h2m3s')).toBe(3723)
    expect(parseStart('2m')).toBe(120)
  })

  it('無い / 読めないものは頭から', () => {
    expect(parseStart(null)).toBe(0)
    expect(parseStart('')).toBe(0)
    expect(parseStart('あとで')).toBe(0)
  })
})

describe('normalizeLinks', () => {
  it('[{ label, url }] を受ける', () => {
    expect(normalizeLinks([{ label: 'Marp 公式', url: 'https://marp.app/' }])).toEqual([
      { label: 'Marp 公式', url: 'https://marp.app/' },
    ])
  })

  it('{ label: url } の表でも受ける', () => {
    expect(normalizeLinks({ 'Marp 公式': 'https://marp.app/' })).toEqual([
      { label: 'Marp 公式', url: 'https://marp.app/' },
    ])
  })

  it('label が無ければ url を出す（無題のリンクを作らない）', () => {
    expect(normalizeLinks([{ url: 'https://marp.app/' }])).toEqual([
      { label: 'https://marp.app/', url: 'https://marp.app/' },
    ])
  })

  it('url が無い行は落とす', () => {
    expect(normalizeLinks([{ label: 'どこにも行かない' }])).toEqual([])
    expect(normalizeLinks(undefined)).toEqual([])
  })
})
