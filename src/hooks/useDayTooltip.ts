import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { dayLabel } from '../lib/contributions'
import type { ContributionDay } from '../types'

/** 吹き出しがカードからはみ出さないよう、左右に確保しておく余白 */
const EDGE = 78

/** 列が週・行が曜日なので、左右は前後の週、上下は前後の日になる */
const MOVES: Record<string, number> = {
  ArrowRight: 7,
  ArrowLeft: -7,
  ArrowDown: 1,
  ArrowUp: -1,
}

type Tip = { text: string; x: number; y: number; index: number }

/**
 * ヒートマップの升目に出す吹き出し。マウスは乗せるだけ、指は押したまま残す、
 * キーボードは矢印で 1 日ずつ移る、の 3 系統をここで受け持つ。
 */
export function useDayTooltip(cells: (ContributionDay | null)[], latest: number) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  /** 指で押して出した吹き出しは、次にどこかを押すまで消さない */
  const stuck = useRef(false)
  /** キーを押しっぱなしにされても取りこぼさないよう、今いるマスは ref でも持つ */
  const activeRef = useRef<number | null>(null)

  const hide = () => {
    stuck.current = false
    activeRef.current = null
    setTip(null)
  }

  // 指で出した吹き出しは、ヒートマップの外を押したら引っ込める
  useEffect(() => {
    if (!tip) return
    const onDocumentDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) hide()
    }
    document.addEventListener('pointerdown', onDocumentDown)
    return () => document.removeEventListener('pointerdown', onDocumentDown)
  }, [tip])

  /** マスの数字を出す。位置はカード内の座標に直して持つ */
  const showFor = (cell: HTMLElement) => {
    const wrap = wrapRef.current
    const index = Number(cell.dataset.index)
    const day = cells[index]
    if (!wrap || !day) return

    activeRef.current = index
    const cellBox = cell.getBoundingClientRect()
    const wrapBox = wrap.getBoundingClientRect()
    const x = cellBox.left - wrapBox.left + cellBox.width / 2
    setTip({
      text: dayLabel(day),
      // 端のマスでもカードからはみ出さないよう、寄せられる範囲に丸める
      x: Math.min(Math.max(x, EDGE), wrapBox.width - EDGE),
      y: cellBox.top - wrapBox.top,
      index,
    })
  }

  const cellFrom = (event: { target: EventTarget }) =>
    (event.target as HTMLElement).closest<HTMLElement>('[data-index]')

  /** 週の端の空マスは飛ばして隣の日へ */
  const step = (from: number, delta: number) => {
    for (let index = from + delta; index >= 0 && index < cells.length; index += delta) {
      if (cells[index]) return index
    }
    return from
  }

  /** その番号のマスへ移り、横スクロールの外にいれば連れてくる */
  const moveTo = (index: number) => {
    const cell = wrapRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)
    if (!cell) return
    cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    showFor(cell)
  }

  return {
    wrapRef,
    tip,
    hide,
    /** ヒートマップを囲む箱に付ける。ポインタ 3 種はここで受ける */
    surface: {
      onPointerOver: (event: ReactPointerEvent) => {
        // マウスは乗せるだけで出す
        if (event.pointerType === 'touch') return
        const cell = cellFrom(event)
        if (cell) showFor(cell)
      },
      onPointerDown: (event: ReactPointerEvent) => {
        // 指は乗せっぱなしにできないので、押したマスを出したままにする
        if (event.pointerType !== 'touch') return
        const cell = cellFrom(event)
        if (!cell) return
        stuck.current = true
        showFor(cell)
      },
      onPointerLeave: () => {
        if (!stuck.current) hide()
      },
    },
    /** 升目そのものに付ける。フォーカスを持つのはこちら */
    grid: {
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
          hide()
          return
        }
        const delta = MOVES[event.key]
        if (delta === undefined) return
        event.preventDefault()
        const from = activeRef.current
        moveTo(from === null ? latest : step(from, delta))
      },
      onBlur: hide,
    },
  }
}
