import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * クエリの部分更新。空文字を渡したキーは落とす。
 * 絞り込みもページ送りも履歴には積まない（戻るで一覧に帰れるようにする）ので、
 * 常に replace で書く。Slides の ?q= / ?tag= と DeckDetail の ?p= で共有している。
 */
export function useQueryUpdate() {
  const [params, setParams] = useSearchParams()

  const update = useCallback(
    (next: Record<string, string>) => {
      const merged = new URLSearchParams(params)
      for (const [key, value] of Object.entries(next)) {
        if (value) merged.set(key, value)
        else merged.delete(key)
      }
      setParams(merged, { replace: true })
    },
    [params, setParams],
  )

  return [params, update] as const
}
