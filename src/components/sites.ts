// 媒体（Zenn / Qiita）の見せ方の表。色の出どころを媒体の隣に 1 つだけ置く。
//
// アイコンだけがブランドカラーを持ち、文字はホバーでそれに寄る。Hero のボタンは
// 枠線も寄せる。Hero と WRITING が別々に text-zenn / hover:text-zenn-fg を
// 書いていて、片方だけ直せばずれる状態だった。
import { profile } from '../data/profile'
import { QiitaIcon, ZennIcon } from './icons/BrandIcons'
import type { PostSite } from '../types'

type Site = {
  Icon: typeof ZennIcon
  url: string
  /** WRITING の見出し脇に出す表記 */
  handle: string
  /** アイコンに当てるブランドカラー */
  icon: string
  /** ホバーで文字が寄る色。地の上で読める側（-fg）を使う */
  hover: string
  /** Hero のボタンだけ、枠線もブランドカラーへ寄せる */
  hoverBorder: string
}

export const SITES: Record<PostSite, Site> = {
  Zenn: {
    Icon: ZennIcon,
    url: profile.links.zenn,
    handle: 'zenn.dev/atsukish',
    icon: 'text-zenn',
    hover: 'hover:text-zenn-fg',
    hoverBorder: 'hover:border-zenn',
  },
  Qiita: {
    Icon: QiitaIcon,
    url: profile.links.qiita,
    handle: 'qiita.com/atsukish',
    icon: 'text-qiita',
    hover: 'hover:text-qiita-fg',
    hoverBorder: 'hover:border-qiita',
  },
}

/** 並べる順。Zenn を先に置く */
export const SITE_ORDER: PostSite[] = ['Zenn', 'Qiita']
