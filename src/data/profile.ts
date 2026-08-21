import type { CareerEntry, StackGroup } from '../types'

export const profile = {
  name: 'Atsuki Shirasawa',
  /**
   * 肩書き。Hero は総大文字で出すが、字面は CSS の uppercase に任せて
   * ここには 1 通りだけ置く（index.html の題も同じ字面から組む）。
   */
  role: 'Machine Learning Engineer',
  /** ページの主張。この 2 文がファーストビューの中身 */
  lead:
    'Twelve years turning sensor data into HD maps for autonomous driving. Four turning language into actions.',
  support: 'I write up what I learn, and speak about it.',
  siteName: 'atsukish.dev',
  links: {
    github: 'https://github.com/atsuki-shirasawa',
    zenn: 'https://zenn.dev/atsukish',
    qiita: 'https://qiita.com/atsukish',
  },
} as const

/*
 * 同一性の文字列は 5 箇所（profile / Footer / Home / Slides / index.html）に
 * 写っていた。index.html に URL を写さないのと同じ理由でここが 1 本の出どころに
 * なる — vite.config.ts が読んでプレースホルダに入れる。
 */

/** タブと og:title に出す題 */
export const siteTitle = `${profile.name} — ${profile.role}`

/** <meta name="description"> と og:description */
export const metaDescription = `Portfolio of ${profile.name} — ${profile.role.toLowerCase()}. Production ML and MLOps work, tech articles and conference slide decks.`

/** Hero のプロフィール画像と og:image:alt */
export const avatarAlt = `${profile.name}'s GitHub avatar`

// NOTE: 経歴は外部 API から取得できないため手で更新する。
// 社名・案件名・出向先の法人名は出さず、業界と技術領域だけが伝わる粒度で書く。
// 新しい順。CareerTrack が古い順に並べ直して線を引く。
export const career: CareerEntry[] = [
  {
    from: 2022,
    to: null,
    role: 'Lead Engineer, Machine Learning',
    org: 'Retail Tech Company',
    desc: 'Lead engineer on a platform for building and operating LLM agents. Driving generative-AI adoption across the company — running PoCs with business stakeholders and shipping demo applications alongside the platform itself.',
  },
  {
    from: 2019,
    to: 2022,
    role: 'Research Engineer, Team Lead',
    org: 'Digital Map Company',
    desc: 'Computer vision and machine learning pipelines that generate HD maps for autonomous driving. Owned the work end to end — data collection and preparation, algorithms, evaluation, requirements and design — as both an individual contributor and a manager.',
  },
  {
    from: 2016,
    to: 2019,
    role: 'Research Engineer, US branch',
    desc: 'Three years on secondment to the US arm: scouting emerging technology, applying machine learning to map production, and running joint development with local partners.',
  },
  {
    from: 2010,
    to: 2016,
    role: 'Research Engineer',
    desc: 'Corporate R&D on production technology for next-generation map data.',
  },
]

// NOTE: 同じく手動更新。手元のリポジトリの依存関係と、書いた記事・登壇の内容に合わせる。
export const stacks: StackGroup[] = [
  { category: 'Languages', items: ['Python', 'TypeScript', 'C++', 'SQL'] },
  {
    category: 'LLM / AI Agent',
    items: ['LangGraph', 'PydanticAI', 'Google ADK', 'MCP', 'LangChain', 'Arize Phoenix'],
  },
  {
    category: 'ML / Computer Vision',
    items: ['PyTorch', 'TensorFlow', 'Keras', 'OpenCV', 'Jupyter'],
  },
  {
    category: 'Cloud / MLOps',
    items: ['Google Cloud', 'Vertex AI', 'BigQuery', 'AWS', 'Terraform', 'Cloud Build'],
  },
  {
    category: 'Backend / Data',
    items: ['FastAPI', 'PostgreSQL', 'SQLAlchemy', 'PostGIS', 'Streamlit', 'React'],
  },
  { category: 'Dev Tools', items: ['Docker', 'GitHub Actions', 'uv', 'Ruff', 'Claude Code'] },
]
