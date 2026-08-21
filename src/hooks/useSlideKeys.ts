import { useEffect, useRef } from 'react'
import { clampPage } from '../lib/page'

type Options = {
  page: number
  total: number
  go: (page: number) => void
  onToggleFullscreen: () => void
}

/**
 * スライドのキーボード操作。document で受けるので、ビューアの外を触っていても効く。
 * 入力欄にいるときと修飾キー付きは、こちらの用ではないので通す。
 *
 * ただし奪うキーは選ぶ。← → と F は縦スクロールに関わらないので常に効かせるが、
 * Space / PageUp / PageDown / Home / End はページを送る唯一の手段でもあるので、
 * 全画面のときだけにする。通常表示のデッキ詳細には下に本文・タグ・前後送りが
 * あって、これを document で奪うとキーボードでページを読み進められない
 * （ビューアのヒントも「← → to turn pages」しか約束していない）。
 */
export function useSlideKeys({ page, total, go, onToggleFullscreen }: Options) {
  /**
   * 最後に送った先。次の行き先はここから数える。
   *
   * page を閉じ込んで `go(page + 1)` とすると、React が次のレンダーを commit する
   * 前に届いた keydown が全部同じ page を見て同じ行き先を計算し、2 回目以降は
   * 同じ値の書き込みになって消える。矢印キーのオートリピートは秒 30 回ほど来るので、
   * 描画が重い回（大きなデッキで pdf.js が本線を掴んでいるとき）に押した数より
   * 進みが遅い「引っかかる」操作になる。ref なら commit を待たずに数えられる。
   */
  const sent = useRef(page)

  // URL 側が動いたときに合わせ直す（戻る・フィルムストリップ・PDF 内リンク）
  useEffect(() => {
    sent.current = page
  }, [page])

  useEffect(() => {
    /** 送り先を決めて覚える。丸めは lib/page.ts の 1 本に任せる */
    const goTo = (target: number) => {
      const next = clampPage(target, total)
      sent.current = next
      go(next)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return

      /** 全画面はプレゼン中。ページの他に読むものが無いので、送りに全部使える */
      const presenting = document.fullscreenElement !== null

      switch (event.key) {
        case 'ArrowRight':
          goTo(sent.current + 1)
          event.preventDefault()
          break
        case 'ArrowLeft':
          goTo(sent.current - 1)
          event.preventDefault()
          break
        case ' ':
        case 'PageDown':
          if (!presenting) break
          goTo(sent.current + 1)
          event.preventDefault()
          break
        case 'PageUp':
          if (!presenting) break
          goTo(sent.current - 1)
          event.preventDefault()
          break
        case 'Home':
          if (!presenting) break
          goTo(1)
          event.preventDefault()
          break
        case 'End':
          if (!presenting) break
          goTo(total)
          event.preventDefault()
          break
        case 'f':
        case 'F':
          onToggleFullscreen()
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // page は載せない。行き先は sent が持つので、ページごとに張り替える必要がない
  }, [go, total, onToggleFullscreen])
}
