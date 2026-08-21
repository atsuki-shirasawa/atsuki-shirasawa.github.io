// Zenn / Qiita / GitHub から公開データを取得し、src/data/generated.json を更新する。
// ビルド前 (npm run build) と GitHub Actions の日次ジョブから実行される。
// 個々の取得が失敗しても、コミット済みの generated.json の該当部分を残してビルドは続行する。

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { XMLParser } from 'fast-xml-parser'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/data/generated.json')

const ZENN_USER = 'atsukish'
const QIITA_USER = 'atsukish'
const GITHUB_USER = 'atsuki-shirasawa'
const MAX_POSTS = 12
const WEEKS = 53

const log = (...args) => console.log('[fetch-content]', ...args)
const warn = (...args) => console.warn('[fetch-content] ⚠', ...args)

/** 取得の失敗はビルドを落とさない。何が落ちたかだけ言って null を返す */
const warnAndSkip = (label) => (error) => {
  warn(`${label}:`, error.message)
  return null
}

/** コミット済みの内容（取得失敗時のフォールバック） */
function readPrevious() {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8'))
  } catch {
    return null
  }
}

/** 取れなかった項目は、コミット済みの値をそのまま残す */
const keep = (fetched, previous, empty) => fetched ?? previous ?? empty

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'user-agent': 'atsukish-portfolio', ...headers } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return res.json()
}

function resolveGitHubToken() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (fromEnv) return fromEnv
  try {
    // ローカル実行時は gh CLI のトークンを借りる（contributions は GraphQL = 認証必須のため）
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

/** 借りたトークンは覚える。呼び手が 2 人いるので、環境変数の無い手元では
    gh auth token が 2 回起動していた（null も覚えるので undefined と区別する） */
let cachedToken
function githubToken() {
  if (cachedToken === undefined) cachedToken = resolveGitHubToken()
  return cachedToken
}

/** RSS の pubDate → YYYY-MM */
function toYearMonth(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** 並べ替え用。月まで同じ記事が混ざるので日時で比べる */
function toIso(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

async function fetchZennPosts() {
  const res = await fetch(`https://zenn.dev/${ZENN_USER}/feed`, {
    headers: { 'user-agent': 'atsukish-portfolio' },
  })
  if (!res.ok) throw new Error(`zenn feed: ${res.status}`)
  const xml = await res.text()
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml)
  const items = parsed?.rss?.channel?.item ?? []
  return (Array.isArray(items) ? items : [items]).map((item) => ({
    at: toIso(item.pubDate),
    date: toYearMonth(item.pubDate),
    title: String(item.title).trim(),
    site: 'Zenn',
    url: String(item.link).trim(),
  }))
}

async function fetchQiitaPosts() {
  const items = await getJson(
    `https://qiita.com/api/v2/users/${QIITA_USER}/items?per_page=${MAX_POSTS}`,
  )
  return items.map((item) => ({
    at: toIso(item.created_at),
    date: toYearMonth(item.created_at),
    title: String(item.title).trim(),
    site: 'Qiita',
    url: item.url,
  }))
}

async function fetchGitHubProfile() {
  const token = githubToken()
  const headers = token ? { authorization: `Bearer ${token}` } : {}
  const user = await getJson(`https://api.github.com/users/${GITHUB_USER}`, headers)
  // login は返さない。出力に載るのは main() が持つ GITHUB_USER のほうで、
  // ここの値は誰も読んでいなかった
  return {
    // 表示は最大 64px なので 2x 相当を要求しておく
    avatarUrl: `${user.avatar_url}&s=240`,
    publicRepos: user.public_repos,
  }
}

const LEVEL_BY_NAME = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

async function fetchContributions() {
  const token = githubToken()
  if (!token) throw new Error('GITHUB_TOKEN / gh auth token が無いため contributions を取得できません')

  const query = `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays { date contributionCount contributionLevel weekday }
            }
          }
        }
      }
    }`

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'atsukish-portfolio',
    },
    body: JSON.stringify({ query, variables: { login: GITHUB_USER } }),
  })
  if (!res.ok) throw new Error(`github graphql: ${res.status}`)
  const body = await res.json()
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join(', '))

  const calendar = body.data.user.contributionsCollection.contributionCalendar
  const weeks = calendar.weeks.slice(-WEEKS).map((week) => {
    // 先頭週・最終週は 7 日に満たないので、曜日の位置を保ったまま null で埋める
    const days = Array(7).fill(null)
    for (const day of week.contributionDays) {
      days[day.weekday] = {
        d: day.date,
        c: day.contributionCount,
        l: LEVEL_BY_NAME[day.contributionLevel] ?? 0,
      }
    }
    return days
  })
  return { totalContributions: calendar.totalContributions, weeks }
}

const isText = (value) => typeof value === 'string'
const isCount = (value) => Number.isInteger(value) && value >= 0

/**
 * src/types.ts の GeneratedContent と対応する。TypeScript 側は `as` で信じている
 * だけなので、書き出す前に形を確かめる。取得の失敗（外部要因）は前回の内容で凌ぐが、
 * 形が合わないのはこちらのバグなので、静かに配らず落とす。
 */
function assertContent(content) {
  const problems = []
  const check = (ok, field) => {
    if (!ok) problems.push(field)
  }

  check(isText(content.fetchedAt), 'fetchedAt')
  check(
    Array.isArray(content.posts) &&
      content.posts.every(
        (post) =>
          isText(post.date) &&
          isText(post.title) &&
          isText(post.url) &&
          (post.site === 'Zenn' || post.site === 'Qiita'),
      ),
    'posts',
  )
  check(isText(content.github?.login), 'github.login')
  check(isText(content.github?.avatarUrl), 'github.avatarUrl')
  check(isCount(content.github?.publicRepos), 'github.publicRepos')
  check(isCount(content.github?.totalContributions), 'github.totalContributions')
  check(
    Array.isArray(content.github?.weeks) &&
      content.github.weeks.every(
        (week) =>
          Array.isArray(week) &&
          week.every(
            (day) => day === null || (isText(day.d) && isCount(day.c) && day.l >= 0 && day.l <= 4),
          ),
      ),
    'github.weeks',
  )

  if (problems.length > 0) {
    throw new Error(`src/types.ts の GeneratedContent に合わない項目がある — ${problems.join(', ')}`)
  }
}

async function main() {
  const prev = readPrevious()

  const [zenn, qiita, profile, contributions] = await Promise.all([
    fetchZennPosts().catch(warnAndSkip('Zenn')),
    fetchQiitaPosts().catch(warnAndSkip('Qiita')),
    fetchGitHubProfile().catch(warnAndSkip('GitHub profile')),
    fetchContributions().catch(warnAndSkip('GitHub contributions')),
  ])

  let posts
  if (zenn || qiita) {
    posts = [...(zenn ?? []), ...(qiita ?? [])]
      .filter((p) => p.date && p.title && p.url)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, MAX_POSTS)
      // at は並べ替えにしか使わないので出力からは落とす
      .map(({ at: _at, ...post }) => post)
  } else {
    posts = prev?.posts ?? []
    warn('記事の取得に失敗したため既存データを維持します')
  }

  const github = {
    login: GITHUB_USER,
    avatarUrl: keep(profile?.avatarUrl, prev?.github?.avatarUrl, ''),
    publicRepos: keep(profile?.publicRepos, prev?.github?.publicRepos, 0),
    totalContributions: keep(contributions?.totalContributions, prev?.github?.totalContributions, 0),
    weeks: keep(contributions?.weeks, prev?.github?.weeks, []),
  }

  const content = { fetchedAt: new Date().toISOString(), posts, github }
  assertContent(content)
  writeFileSync(OUT, `${JSON.stringify(content, null, 2)}\n`)
  log(
    `更新: 記事 ${posts.length} 件 / repos ${github.publicRepos} / contributions ${github.totalContributions}`,
  )
}

await main()
