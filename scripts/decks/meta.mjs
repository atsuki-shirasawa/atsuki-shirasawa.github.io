// decks/<slug>/index.md の frontmatter を読み、以降が扱う形に正規化する。
// 「どの形式のデッキか」の判定もここ（src/lib/deckView.ts の DeckView に対応する）。
import fs from 'node:fs/promises'
import path from 'node:path'

import matter from 'gray-matter'

import { DECKS_DIR } from './config.mjs'
import { exists, warn } from './util.mjs'

/** List the directories that hold a decks/<slug>/index.md */
export async function findDecks() {
  let entries
  try {
    entries = await fs.readdir(DECKS_DIR, { withFileTypes: true })
  } catch {
    return []
  }
  const decks = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue
    const dir = path.join(DECKS_DIR, entry.name)
    const indexPath = path.join(dir, 'index.md')
    if (!(await exists(indexPath))) {
      warn(`${entry.name}: no index.md, skipped`)
      continue
    }
    decks.push({ slug: entry.name, dir, indexPath })
  }
  return decks
}

export async function readMeta({ slug, dir, indexPath }) {
  const raw = await fs.readFile(indexPath, 'utf8')
  const { data, content } = matter(raw)

  // A pdf: entry means a PDF deck. Without one, the body is a Marp deck —
  // unless there is no body either, in which case the talk is the video alone.
  const pdfRef = typeof data.pdf === 'string' ? data.pdf.trim() : null
  // pdf: が http(s) なら、よそでホストされている資料。ビルド時に取りに行く
  const remote = pdfRef && /^https?:\/\//i.test(pdfRef) ? pdfRef : null
  const video = normalizeVideo(data.video)
  const format = pdfRef ? 'pdf' : content.trim() ? 'marp' : 'video'

  if (!data.title) throw new Error(`${slug}/index.md: frontmatter is missing title`)
  if (format === 'video' && !video) {
    throw new Error(`${slug}/index.md: has no slides — write the deck body, point pdf: at a file, or give it a video:`)
  }

  return {
    slug,
    dir,
    indexPath,
    format,
    pdfRef,
    remote,
    body: content,
    title: String(data.title),
    date: normalizeDate(data.date),
    event: data.event ? String(data.event) : null,
    speaker: data.speaker ? String(data.speaker) : null,
    description: data.description ? String(data.description) : '',
    tags: normalizeTags(data.tags),
    draft: data.draft === true,
    // Directives handed to Marp, carried straight over from the frontmatter
    theme: data.theme ? String(data.theme) : null,
    paginate: data.paginate,
    links: normalizeLinks(data.links),
    video,
  }
}

/** Even when YAML hands back a Date, return YYYY-MM-DD in UTC so the day never shifts */
function normalizeDate(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value).trim()
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!match) return text
  const [, y, m, d] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function normalizeTags(value) {
  if (!value) return []
  const list = Array.isArray(value) ? value : String(value).split(',')
  const seen = new Set()
  const tags = []
  for (const item of list) {
    const tag = String(item).trim()
    if (!tag || seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    tags.push(tag)
  }
  return tags
}

/**
 * video: に貼られた YouTube の URL を、埋め込みに要るぶんだけに削ぐ。
 * watch / youtu.be / embed / live のどれでも受け、開始位置（90, 90s, 1m30s）も拾う。
 * YouTube 以外は今のところ扱わない。
 */
function normalizeVideo(value) {
  if (!value) return null
  const raw = String(typeof value === 'object' ? (value.url ?? '') : value).trim()
  if (!raw) return null

  let url
  try {
    url = new URL(raw)
  } catch {
    warn(`video: ${raw} は URL として読めないので無視した`)
    return null
  }

  const host = url.hostname.replace(/^www\./, '')
  let id = ''
  if (host === 'youtu.be') id = url.pathname.slice(1)
  else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    id = url.searchParams.get('v') ?? url.pathname.replace(/^\/(embed|live|shorts)\//, '')
  }
  id = id.split('/')[0]
  if (!/^[\w-]{11}$/.test(id)) {
    warn(`video: ${raw} から YouTube の動画 ID を取り出せなかったので無視した`)
    return null
  }

  return { provider: 'youtube', id, start: parseStart(url.searchParams.get('t') ?? url.searchParams.get('start')) }
}

/** 90 / 90s / 1m30s / 1h2m3s を秒に */
function parseStart(value) {
  if (!value) return 0
  const text = String(value).trim()
  if (/^\d+$/.test(text)) return Number(text)
  const match = text.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!match) return 0
  const [, h = 0, m = 0, sec = 0] = match
  return Number(h) * 3600 + Number(m) * 60 + Number(sec)
}

/** Accepts links: [{label, url}] or {label: url} */
function normalizeLinks(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => ({ label: String(item?.label ?? item?.url ?? ''), url: String(item?.url ?? '') }))
      .filter((item) => item.url)
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([label, url]) => ({ label, url: String(url) }))
  }
  return []
}
