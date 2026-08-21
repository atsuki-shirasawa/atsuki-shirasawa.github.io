import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * クエリの部分更新。空文字を渡したキーは落とす。
 * 絞り込みもページ送りも履歴には積まない（戻るで一覧に帰れるようにする）ので、
 * 常に replace で書く。Slides の ?q= / ?tag= と DeckDetail の ?p= で共有している。
 *
 * 直前の値は setParams の関数形式で受ける。閉じ込んだ params から組むと、同じ tick で
 * 2 回呼んだとき 2 回目が 1 回目を見ないまま上書きする（先の変更が消える）。
 */
export function useQueryUpdate() {
  const [params, setParams] = useSearchParams()

  const update = useCallback(
    (next: Record<string, string>) => {
      setParams((prev) => {
        const merged = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(next)) {
          if (value) merged.set(key, value)
          else merged.delete(key)
        }
        return merged
      }, { replace: true })
    },
    [setParams],
  )

  return [params, update] as const
}
