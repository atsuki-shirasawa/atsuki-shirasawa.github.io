import { useCallback, type RefObject } from 'react'

/**
 * その要素を全画面に出す／戻すのを切り替える。useCallback で返すので、
 * これを使う effect が依存に正しく並べられる。
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  return useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void ref.current?.requestFullscreen?.()
  }, [ref])
}
