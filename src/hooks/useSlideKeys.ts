import { useEffect } from 'react'

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
  useEffect(() => {
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
          go(page + 1)
          event.preventDefault()
          break
        case 'ArrowLeft':
          go(page - 1)
          event.preventDefault()
          break
        case ' ':
        case 'PageDown':
          if (!presenting) break
          go(page + 1)
          event.preventDefault()
          break
        case 'PageUp':
          if (!presenting) break
          go(page - 1)
          event.preventDefault()
          break
        case 'Home':
          if (!presenting) break
          go(1)
          event.preventDefault()
          break
        case 'End':
          if (!presenting) break
          go(total)
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
  }, [go, page, total, onToggleFullscreen])
}
