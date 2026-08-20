import { PlayIcon } from './icons/UiIcons'

/**
 * 円の役目。mark はカードの隅に置く「動画もある」の記章で、押せない。
 * card と embed は再生の的で、囲みのホバーに反応する。大きさが 2 つあるのは
 * 載る面の幅が違うため（カードは 286px、埋め込みは版面いっぱい）。
 */
type Kind = 'mark' | 'card' | 'embed'

/** ガラスの円。どんな絵の上でも三角が読めるよう、ぼかしと文字色を対で持つ */
const CIRCLE = 'flex items-center justify-center rounded-full bg-glass backdrop-blur-sm'

/** 押せる的。囲み（group）のホバーでアクセントに変わり、少し膨らむ */
const TARGET =
  'shadow-float transition-[background,scale] duration-200 group-hover:scale-106 group-hover:bg-accent'

/* 三角形の重心はやや左に寄るので、どの大きさでも光学的に中央へ寄せる */
const SHAPE: Record<Kind, { circle: string; icon: string }> = {
  mark: { circle: 'size-[26px]', icon: 'size-3.5 translate-x-px' },
  card: { circle: `size-[56px] ${TARGET}`, icon: 'size-6 translate-x-0.5' },
  embed: { circle: `size-[68px] ${TARGET}`, icon: 'size-[30px] translate-x-0.5' },
}

type Props = {
  kind: Kind
  /** 置き場所は置く側が持つ。円そのものの見た目はここで閉じる */
  className?: string
  /** 記章に添える言葉。押せるもの（button や a）の中に入るときは要らない */
  label?: string
}

/** 再生のガラス円。カードの記章、動画だけのカードの的、埋め込みの的で共有する */
export default function PlayBadge({ kind, className = '', label }: Props) {
  const shape = SHAPE[kind]

  return (
    <span
      className={`${CIRCLE} ${shape.circle} ${className}`}
      title={label}
      aria-hidden={label ? undefined : 'true'}
    >
      <PlayIcon className={`${shape.icon} fill-on-media`} />
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  )
}
