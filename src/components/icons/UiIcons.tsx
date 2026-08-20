// UI 用のアイコン。Feather Icons（MIT）の描き方を下敷きに、線幅と端の丸めを揃えている。
//
// 2 種類ある。size を取るものは自分で線を引く（ヘッダのように寸法が 1 つに決まる場所）。
// className だけを取るものは形しか持たず、太さ・塗り・寸法は置いた側の CSS が決める
// （矢印や再生ボタンは同じ形を大小で使い回すので、そちらに任せる方が素直）。

type IconProps = {
  size?: number
}

type ShapeProps = {
  className?: string
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

/** 前後に送る矢印。レール（Carousel）とスライドのページ送りで共有している */
export function ChevronIcon({
  direction,
  className,
}: ShapeProps & { direction: 'left' | 'right' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

/** 再生。動画のあるカードの印と、埋め込みの再生ボタンで共有している */
export function PlayIcon({ className }: ShapeProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

/** 検索欄の虫めがね。端の丸めは形の一部なので持たせる（太さ・塗り・寸法は置いた側） */
export function SearchIcon({ className }: ShapeProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}
