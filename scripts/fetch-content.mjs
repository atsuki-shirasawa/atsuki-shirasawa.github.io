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

/** コミット済みの内容（取得失敗時のフォールバック） */
function readPrevious() {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8'))
  } catch {
    return null
  }
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'user-agent': 'atsukish-portfolio', ...headers } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return res.json()
}

function githubToken() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (fromEnv) return fromEnv
  try {
    // ローカル実行時は gh CLI のトークンを借りる（contributions は GraphQL = 認証必須のため）
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
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

function decodeEntities(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
}

/**
 * 記事ページの og:image を 1 件取り出す。サムネイルは無くても記事は出せるので、
 * 失敗しても null を返すだけにして取得全体は止めない。
 */
async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; atsukish-portfolio)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const hit =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    return hit ? decodeEntities(hit[1]) : null
  } catch (e) {
    warn(`og:image (${url}):`, e.message)
    return null
  }
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
    // Zenn は RSS の enclosure に OGP 画像を載せてくれる
    thumbnail: item.enclosure?.['@_url'] ?? null,
  }))
}

async function fetchQiitaPosts() {
  const items = await getJson(
    `https://qiita.com/api/v2/users/${QIITA_USER}/items?per_page=${MAX_POSTS}`,
  )
  // Qiita API はサムネイルを返さないので、記事ページの og:image を読みに行く
  const thumbnails = await Promise.all(items.map((item) => fetchOgImage(item.url)))
  return items.map((item, i) => ({
    at: toIso(item.created_at),
    date: toYearMonth(item.created_at),
    title: String(item.title).trim(),
    site: 'Qiita',
    url: item.url,
    thumbnail: thumbnails[i],
  }))
}

async function fetchGitHubProfile() {
  const token = githubToken()
  const headers = token ? { authorization: `Bearer ${token}` } : {}
  const user = await getJson(`https://api.github.com/users/${GITHUB_USER}`, headers)
  const repos = await getJson(
    `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner&sort=updated`,
    headers,
  )
  return {
    login: user.login,
    // 表示は最大 64px なので 2x 相当を要求しておく
    avatarUrl: `${user.avatar_url}&s=240`,
    publicRepos: user.public_repos,
    followers: user.followers,
    stars: repos.reduce((sum, repo) => sum + (repo.stargazers_count ?? 0), 0),
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

async function main() {
  const prev = readPrevious()

  const [zenn, qiita, profile, contributions] = await Promise.all([
    fetchZennPosts().catch((e) => (warn('Zenn:', e.message), null)),
    fetchQiitaPosts().catch((e) => (warn('Qiita:', e.message), null)),
    fetchGitHubProfile().catch((e) => (warn('GitHub profile:', e.message), null)),
    fetchContributions().catch((e) => (warn('GitHub contributions:', e.message), null)),
  ])

  // 記事ページの og:image は 1 件ずつ失敗しうる（CI からの取得が弾かれるなど）。
  // 前回取れていた URL はそのまま残し、サムネイルだけが欠けた状態で公開しない。
  const knownThumbnails = new Map(
    (prev?.posts ?? []).filter((p) => p.thumbnail).map((p) => [p.url, p.thumbnail]),
  )

  let posts
  if (zenn || qiita) {
    posts = [...(zenn ?? []), ...(qiita ?? [])]
      .filter((p) => p.date && p.title && p.url)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, MAX_POSTS)
      // at は並べ替えにしか使わないので出力からは落とす
      .map(({ at: _at, ...post }) => ({
        ...post,
        thumbnail: post.thumbnail ?? knownThumbnails.get(post.url) ?? null,
      }))
  } else {
    posts = prev?.posts ?? []
    warn('記事の取得に失敗したため既存データを維持します')
  }

  const github = {
    login: GITHUB_USER,
    avatarUrl: profile?.avatarUrl ?? prev?.github?.avatarUrl ?? '',
    publicRepos: profile?.publicRepos ?? prev?.github?.publicRepos ?? 0,
    followers: profile?.followers ?? prev?.github?.followers ?? 0,
    stars: profile?.stars ?? prev?.github?.stars ?? 0,
    totalContributions:
      contributions?.totalContributions ?? prev?.github?.totalContributions ?? 0,
    weeks: contributions?.weeks ?? prev?.github?.weeks ?? [],
  }

  const content = { fetchedAt: new Date().toISOString(), posts, github }
  writeFileSync(OUT, `${JSON.stringify(content, null, 2)}\n`)
  const missing = posts.filter((p) => !p.thumbnail).length
  log(
    `更新: 記事 ${posts.length} 件（サムネイル欠け ${missing} 件）/ repos ${github.publicRepos} / stars ${github.stars} / contributions ${github.totalContributions}`,
  )
}

await main()
