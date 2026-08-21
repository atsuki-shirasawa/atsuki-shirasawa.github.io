import { describe, expect, it } from 'vitest'
import { clampPage, pageRange, parsePageParam } from './page'

// URL の ?p= / ビューアのページ送り / pdf.js の描画要求が同じ規則で動く必要がある。
// 3 箇所が別々に丸めると「URL は 7 なのに 6 ページ目が出る」が起きる。

describe('clampPage', () => {
  it('1..total に収める', () => {
    expect(clampPage(3, 6)).toBe(3)
    expect(clampPage(1, 6)).toBe(1)
    expect(clampPage(6, 6)).toBe(6)
  })

  it('範囲外は端で止める', () => {
    expect(clampPage(0, 6)).toBe(1)
    expect(clampPage(-4, 6)).toBe(1)
    expect(clampPage(7, 6)).toBe(6)
    expect(clampPage(999, 6)).toBe(6)
  })

  it('total が 0（動画だけのデッキ）でも 1 を返す', () => {
    expect(clampPage(1, 0)).toBe(1)
    expect(clampPage(5, 0)).toBe(1)
    expect(clampPage(0, 0)).toBe(1)
  })

  it('小数は切り捨てる。負の小数でも 1 より下へ行かない', () => {
    expect(clampPage(2.7, 6)).toBe(2)
    expect(clampPage(-0.5, 6)).toBe(1)
  })
})

describe('parsePageParam', () => {
  it('無い / 読めないものは 1 ページ目', () => {
    expect(parsePageParam(null, 6)).toBe(1)
    expect(parsePageParam('', 6)).toBe(1)
    expect(parsePageParam('abc', 6)).toBe(1)
    expect(parsePageParam('Infinity', 6)).toBe(1)
  })

  it('読めるものは clampPage と同じ規則で丸める', () => {
    expect(parsePageParam('4', 6)).toBe(4)
    expect(parsePageParam('99', 6)).toBe(6)
    expect(parsePageParam('0', 6)).toBe(1)
    expect(parsePageParam('-3', 6)).toBe(1)
  })
})

describe('pageRange', () => {
  it('1 から count まで', () => {
    expect(pageRange(4)).toEqual([1, 2, 3, 4])
    expect(pageRange(1)).toEqual([1])
  })

  it('0 以下は空（動画だけのデッキは pageCount が 0）', () => {
    expect(pageRange(0)).toEqual([])
    expect(pageRange(-3)).toEqual([])
  })

  it('端数は切り捨てる', () => {
    expect(pageRange(2.9)).toEqual([1, 2])
  })
})
