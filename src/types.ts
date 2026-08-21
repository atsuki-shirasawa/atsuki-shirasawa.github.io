export type CareerEntry = {
  /** 開始年 */
  from: number
  /** 終了年。在職中は null */
  to: number | null
  role: string
  /** 変わったときだけ出す。伏せた表記で、業界だけが伝わる粒度にする */
  org?: string
  desc: string
}

export type StackGroup = {
  category: string
  items: string[]
}

export type PostSite = 'Zenn' | 'Qiita'

export type Post = {
  /** YYYY-MM */
  date: string
  title: string
  site: PostSite
  url: string
}

/**
 * frontmatter の links: の 1 件。デッキ「の中の」リンクなので、デッキ「への」
 * リンクを置くコンポーネント DeckLink とは別物 — 同じ名前だと 1 つのファイルで
 * 両方を import できないため、型のほうを改名してある。
 */
export type DeckResource = {
  label: string
  url: string
}

/** frontmatter の video: から起こした発表動画 */
export type DeckVideo = {
  provider: 'youtube'
  id: string
  /** 再生開始位置（秒） */
  start: number
}

/** decks/<slug>/index.md 1 件ぶん。scripts/build-decks.mjs が書き出す */
export type Deck = {
  slug: string
  title: string
  /** YYYY-MM-DD。frontmatter に無ければ null */
  date: string | null
  event: string | null
  speaker: string | null
  description: string
  tags: string[]
  links: DeckResource[]
  /** 発表動画。frontmatter に video: が無ければ null */
  video: DeckVideo | null
  /** よそでホストされている資料を取り込んだときの配布元 URL */
  source: string | null
  /** Marp の Markdown か、置いた PDF か、スライドが無く動画だけか */
  format: 'marp' | 'pdf' | 'video'
  /** 動画だけのデッキは 0 */
  pageCount: number
  /** width / height。16:9 なら 1.7778 */
  aspect: number
}

/** 0（なし）〜 4（最も濃い）のコントリビューション強度 */
export type ContributionLevel = 0 | 1 | 2 | 3 | 4

/** ヒートマップ 1 マス。週の端で日付が存在しないマスは null */
export type ContributionDay = {
  /** YYYY-MM-DD */
  d: string
  /** その日のコントリビューション数 */
  c: number
  l: ContributionLevel
}

export type GitHubActivity = {
  login: string
  /** プロフィール画像。取得できなかったときは空文字 */
  avatarUrl: string
  publicRepos: number
  totalContributions: number
  /** 直近 53 週ぶんを週ごと（各週は日曜〜土曜の 7 要素）に並べたもの */
  weeks: (ContributionDay | null)[][]
}

export type GeneratedContent = {
  fetchedAt: string
  posts: Post[]
  github: GitHubActivity
}
