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

      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          go(page + 1)
          event.preventDefault()
          break
        case 'ArrowLeft':
        case 'PageUp':
          go(page - 1)
          event.preventDefault()
          break
        case 'Home':
          go(1)
          event.preventDefault()
          break
        case 'End':
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
