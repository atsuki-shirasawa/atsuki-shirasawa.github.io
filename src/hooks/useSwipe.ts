import { useEffect, type RefObject } from 'react'

/** これ未満の横移動は、めくる意図ではないとみなす */
const THRESHOLD = 40

/**
 * 指の横振りを拾う。マウスは対象にしない（ドラッグで送られると鬱陶しい）。
 * スライドの文字は選択できるので、文字を拾ったドラッグもスワイプとは見ない。
 */
export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipe: (direction: 1 | -1) => void,
) {
  useEffect(() => {
    const target = ref.current
    if (!target) return
    let startX = 0
    let startY = 0
    let tracking = false

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      startX = event.clientX
      startY = event.clientY
      tracking = true
    }
    const onUp = (event: PointerEvent) => {
      if (!tracking) return
      tracking = false
      if (!document.getSelection()?.isCollapsed) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
      onSwipe(dx < 0 ? 1 : -1)
    }
    const onCancel = () => {
      tracking = false
    }

    target.addEventListener('pointerdown', onDown)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onCancel)
    return () => {
      target.removeEventListener('pointerdown', onDown)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onCancel)
    }
  }, [ref, onSwipe])
}
