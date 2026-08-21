import { useEffect } from 'react'

/**
 * タブに出す題。3 つのページが同じ useEffect を写していたので 1 本にした。
 *
 * 空文字を渡した回は触らない。DeckDetail は slug が引けるまで題が決まらず、
 * フックは早期 return より前に呼ばなければならないため。
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])
}
