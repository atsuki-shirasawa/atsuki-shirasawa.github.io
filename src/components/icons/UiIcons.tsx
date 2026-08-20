// UI 用のアイコン。Feather Icons（MIT）の描き方を下敷きに、
// Carousel の矢印と同じ線幅・同じ端の丸めで揃えている。

type IconProps = {
  size?: number
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** ライトテーマへ切り替えるトグルに出す太陽 */
export function SunIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.93 4.93 6.8 6.8M17.2 17.2l1.87 1.87M17.2 6.8l1.87-1.87M4.93 19.07 6.8 17.2" />
    </svg>
  )
}

/** ダークテーマへ切り替えるトグルに出す月 */
export function MoonIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true" focusable="false">
      <path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8z" />
    </svg>
  )
}

/** Slides への導線に出すスクリーン（スタンド付き） */
export function SlidesIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M12 16v4M8.5 20h7" />
    </svg>
  )
}
