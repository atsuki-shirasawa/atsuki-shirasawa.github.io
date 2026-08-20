#!/usr/bin/env node
/**
 * Deck normalisation pipeline
 *
 *   decks/<slug>/index.md  ──(Marp goes through marp-cli)──┐
 *   decks/<slug>/*.pdf     ─────────────────────────────────┤
 *   pdf: https://…         ──(fetched at build time)────────┴─→ PDF
 *
 * A deck with no body and no pdf: is a talk that only has a recording. It
 * carries its video: and skips this pipeline entirely.
 *                                                                │
 *        public/decks/<slug>/{slides.pdf, p-1.webp, t-N.webp}
 *        src/data/decks.json      (metadata)
 *        public/decks-search.json (slide text, fetched on the first search)
 *
 * Markdown or PDF in, the same artefacts out. The React side never sees the
 * difference.
 *
 * The PDF is the deck: the viewer renders it with pdf.js in the browser, so no
 * full-size page images are written. What stays is the still imagery the PDF
 * can't provide on its own — the filmstrip thumbnails and one poster for page 1
 * (the card hero, and what the viewer shows while pdf.js loads). Search text is
 * extracted here so searching needs no PDF.
 *
 * よそが配布している資料（pdf: に URL を書いたもの）は例外で、こちらでは抱えない。
 * 表紙 1 枚だけをサムネイルにして、あとは配布元のリンクへ送る。PDF はレンダリング
 * のために一度だけ落とし、終わったら消す。
 */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import matter from 'gray-matter'
import sharp from 'sharp'
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas'

// pdfjs reaches for DOM classes Node lacks, so hand it the canvas implementations first
globalThis.DOMMatrix ??= DOMMatrix
globalThis.Path2D ??= Path2D
globalThis.ImageData ??= ImageData

const execFileAsync = promisify(execFile)
const root = fileURLToPath(new URL('..', import.meta.url))

const DECKS_DIR = path.join(root, 'decks')
const OUT_DIR = path.join(root, 'public', 'decks')
const PDFJS_OUT_DIR = path.join(root, 'public', 'pdfjs')
const GEN_FILE = path.join(root, 'src', 'data', 'decks.json')
const SEARCH_FILE = path.join(root, 'public', 'decks-search.json')
const CACHE_FILE = path.join(root, '.cache', 'decks.json')
const PDFJS_DIR = path.join(root, 'node_modules', 'pdfjs-dist')
const MARP_BIN = path.join(root, 'node_modules', '@marp-team', 'marp-cli', 'marp-cli.js')

/** Bump this when a change alters the output. It invalidates every cached deck. */
const PIPELINE_VERSION = 'portfolio-2'

const POSTER_WIDTH = 1600 // page 1: the card hero, and the viewer's placeholder
const THUMB_WIDTH = 480 // for the filmstrip and the card flip preview

/**
 * pdf.js reaches for these at runtime — cmaps for PDFs that reference a CJK
 * encoding instead of embedding it, standard_fonts for the base-14 faces
 * (Helvetica, Times) that plenty of exporters leave out. Both are fetched only
 * when a PDF actually needs them, so they cost nothing on a deck that embeds
 * everything. Without them such a deck renders blank glyphs.
 */
const PDFJS_RUNTIME_DIRS = ['cmaps', 'standard_fonts']

const args = new Set(process.argv.slice(2))
const force = args.has('--force')

/* ── Logging ────────────────────────────────────────── */
const log = (...m) => console.log('[decks]', ...m)
const warn = (...m) => console.warn('[decks]', ...m)

/* ── Finding decks and reading their metadata ───────── */

/** List the directories that hold a decks/<slug>/index.md */
async function findDecks() {
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

async function readMeta({ slug, dir, indexPath }) {
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

/* ── Marp to PDF ────────────────────────────────────── */

/**
 * Write the PDF with marp-cli. The temporary file it reads carries the added
 * `marp: true` and sits in the deck's own directory, so relative image paths
 * still resolve.
 */
async function marpToPdf(deck, pdfOut) {
  const raw = await fs.readFile(deck.indexPath, 'utf8')
  const { data, content } = matter(raw)
  const directives = {
    ...data,
    marp: true,
    theme: data.theme ?? 'default',
    paginate: data.paginate ?? true,
  }
  // Drop the metadata Marp doesn't read from the temporary file
  for (const key of ['pdf', 'tags', 'event', 'speaker', 'draft', 'links', 'date', 'description', 'video']) {
    delete directives[key]
  }

  const tmpPath = path.join(deck.dir, '.marp-build.md')
  await fs.writeFile(tmpPath, matter.stringify(content, directives), 'utf8')
  try {
    await execFileAsync(
      process.execPath,
      // --no-stdin is required: without it marp-cli waits on stdin and hangs
      [MARP_BIN, tmpPath, '--pdf', '--allow-local-files', '--no-config-file', '--no-stdin', '-o', pdfOut],
      {
        cwd: deck.dir,
        env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? findChrome() },
        // Don't wait forever if Chrome fails to come up
        timeout: Number(process.env.MARP_TIMEOUT_MS ?? 180_000),
        maxBuffer: 8 * 1024 * 1024,
      },
    )
  } catch (error) {
    const detail = [error.stderr, error.stdout, error.message].filter(Boolean).join('\n').trim()
    throw new Error(
      `${deck.slug}: Marp could not write the PDF. Chrome or Chromium is required (point CHROME_PATH at it).\n${detail}`,
    )
  } finally {
    await fs.rm(tmpPath, { force: true })
  }
}

/** Look for Chrome in the usual places. If it isn't there, let marp-cli search. */
function findChrome() {
  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']
  return candidates.find((candidate) => existsSync(candidate))
}

/** よそでホストされている PDF を落としてくる */
const MAX_REMOTE_BYTES = 60 * 1024 * 1024

async function downloadPdf(url, target) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'atsukish-portfolio', accept: 'application/pdf,*/*' },
  })
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > MAX_REMOTE_BYTES) {
    throw new Error(`${url}: ${Math.round(buffer.byteLength / 1024 / 1024)}MB は大きすぎる`)
  }
  // content-type は当てにならないので中身で判断する
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error(`${url}: PDF ではないものが返ってきた`)
  }
  await fs.writeFile(target, buffer)
  log(`${path.basename(path.dirname(target))}: fetched ${Math.round(buffer.byteLength / 1024)}KB from ${url}`)
}

/* ── PDF to page images and text ────────────────────── */

let pdfjsPromise
function loadPdfjs() {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs')
  return pdfjsPromise
}

/**
 * @param {boolean} coverOnly 表紙 1 枚だけをサムネイルにして、本文も残りのページも作らない。
 *   よそから借りている資料に使う
 */
async function renderPdf(pdfPath, outDir, coverOnly = false) {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await fs.readFile(pdfPath))
  // Dispose through the loading task (PDFDocumentProxy.destroy went away in pdfjs 6)
  const loadingTask = pdfjs.getDocument({
    data,
    standardFontDataUrl: path.join(PDFJS_DIR, 'standard_fonts') + path.sep,
    cMapUrl: path.join(PDFJS_DIR, 'cmaps') + path.sep,
    cMapPacked: true,
    isEvalSupported: false,
  })
  const doc = await loadingTask.promise
  const pageCount = doc.numPages

  const texts = []
  let aspect = 16 / 9

  const lastPage = coverOnly ? 1 : pageCount

  for (let pageNumber = 1; pageNumber <= lastPage; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const unscaled = page.getViewport({ scale: 1 })
    if (pageNumber === 1) aspect = unscaled.width / unscaled.height

    // Page 1 carries the poster, so it alone is worth the big render.
    // Every other page only ever becomes a thumbnail.
    const isFirst = pageNumber === 1 && !coverOnly
    const width = isFirst ? POSTER_WIDTH : THUMB_WIDTH
    const viewport = page.getViewport({ scale: width / unscaled.width })
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height))
    const context = canvas.getContext('2d')
    // Lay down white first, or a transparent PDF renders black
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise

    const png = canvas.toBuffer('image/png')
    if (isFirst) {
      await sharp(png).webp({ quality: 86, effort: 4 }).toFile(path.join(outDir, 'p-1.webp'))
    }
    await sharp(png)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 74, effort: 4 })
      .toFile(path.join(outDir, `t-${pageNumber}.webp`))

    if (!coverOnly) {
      const textContent = await page.getTextContent()
      texts.push(joinTextItems(textContent.items))
    }
    page.cleanup()
  }

  await loadingTask.destroy()
  return { pageCount, aspect: Number(aspect.toFixed(4)), text: squash(texts.join('\n')) }
}

/**
 * PDF text often arrives split per glyph, so join it without a separator.
 * Joining on a space scatters Japanese into "ス ラ イ ド".
 */
function joinTextItems(items) {
  let out = ''
  for (const item of items) {
    if (typeof item.str !== 'string') continue
    out += item.str
    if (item.hasEOL) out += '\n'
  }
  return out
}

/** Collapse whitespace for the search index */
function squash(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 20000)
}

/* ── Building a single deck ─────────────────────────── */

async function buildDeck(deck) {
  const outDir = path.join(OUT_DIR, deck.slug)
  await fs.rm(outDir, { recursive: true, force: true })

  // スライドが無い（動画だけの）デッキ。出力するものは何も無い
  if (deck.format === 'video') {
    log(`${deck.slug}: video only, no slides to build`)
    return { pageCount: 0, aspect: 1.7778, text: '' }
  }

  await fs.mkdir(outDir, { recursive: true })

  const pdfOut = path.join(outDir, 'slides.pdf')
  if (deck.format === 'marp') {
    await marpToPdf(deck, pdfOut)
  } else if (deck.remote) {
    await downloadPdf(deck.remote, pdfOut)
  } else {
    const source = path.resolve(deck.dir, deck.pdfRef)
    if (!(await exists(source))) throw new Error(`${deck.slug}: ${deck.pdfRef} not found`)
    await fs.copyFile(source, pdfOut)
  }

  const rendered = await renderPdf(pdfOut, outDir, Boolean(deck.remote))

  if (deck.remote) {
    // 借りものを置きっぱなしにしない。カードに要るのは t-1.webp だけ
    await fs.rm(pdfOut, { force: true })
    log(`${deck.slug}: ${rendered.pageCount} pages upstream, kept the cover only`)
    return rendered
  }

  log(`${deck.slug}: ${rendered.pageCount} pages (${deck.format})`)
  return rendered
}

/* ── Cache ─────────────────────────────────────────── */

/**
 * Fingerprint a deck directory from its contents.
 * Hash the bytes rather than the mtimes — git checkout doesn't restore mtimes,
 * so mixing them in would miss the cache on every CI run.
 */
async function fingerprint(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true })
  const files = entries
    .filter((entry) => entry.isFile() && entry.name !== '.marp-build.md')
    .map((entry) => path.join(entry.parentPath ?? entry.path ?? dir, entry.name))
    .sort()

  const hash = createHash('sha256')
  hash.update(`v${PIPELINE_VERSION}|p${POSTER_WIDTH}|t${THUMB_WIDTH}`)
  for (const file of files) {
    hash.update(path.relative(dir, file))
    hash.update(await fs.readFile(file))
  }
  return hash.digest('hex')
}

async function readCache() {
  if (force) return {}
  try {
    return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

/* ── Main ──────────────────────────────────────────── */

async function main() {
  await copyPdfjsRuntime()

  const found = await findDecks()
  if (found.length === 0) {
    warn('No decks found in decks/. Writing an empty index.')
  }

  const cache = await readCache()
  const nextCache = {}
  const built = []
  const failures = []

  for (const found_ of found) {
    let deck
    try {
      deck = await readMeta(found_)
    } catch (error) {
      failures.push(error.message)
      continue
    }
    if (deck.draft && process.env.INCLUDE_DRAFTS !== '1') {
      log(`${deck.slug}: draft, skipped`)
      continue
    }

    const cached = cache[deck.slug]
    try {
      const stamp = await fingerprint(deck.dir)
      let rendered
      const marker = deck.remote ? 't-1.webp' : 'p-1.webp'
      const cacheUsable =
        deck.format === 'video' || (await exists(path.join(OUT_DIR, deck.slug, marker)))
      if (cached?.stamp === stamp && cacheUsable) {
        rendered = cached.rendered
        log(`${deck.slug}: unchanged, using the cache`)
      } else {
        rendered = await buildDeck(deck)
      }
      nextCache[deck.slug] = { stamp, rendered }
      built.push(toRecord(deck, rendered))
    } catch (error) {
      // よそから取ってくる資料は、こちらの都合と関係なく落ちる。前に作ったものが
      // 残っているなら、それで公開を続ける方がまし。
      if (deck.remote && cached?.rendered) {
        warn(`${deck.slug}: ${error.message ?? error} — 前回の内容で続行します`)
        nextCache[deck.slug] = cached
        built.push(toRecord(deck, cached.rendered))
        continue
      }
      failures.push(error.message ?? String(error))
    }
  }

  built.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title))

  // The slide text is only needed once someone searches, so it is written
  // separately and fetched at that point instead of riding in the JS bundle.
  const meta = built.map(({ text, ...rest }) => rest)
  const searchText = built.map(({ slug, text }) => ({ slug, text }))

  await fs.mkdir(path.dirname(GEN_FILE), { recursive: true })
  await fs.writeFile(GEN_FILE, `${JSON.stringify({ decks: meta }, null, 2)}\n`, 'utf8')
  await fs.mkdir(path.dirname(SEARCH_FILE), { recursive: true })
  await fs.writeFile(SEARCH_FILE, `${JSON.stringify(searchText)}\n`, 'utf8')
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true })
  await fs.writeFile(CACHE_FILE, `${JSON.stringify(nextCache, null, 2)}\n`, 'utf8')

  // Clear out the output of decks that no longer exist
  await pruneOutputs(new Set(built.map((deck) => deck.slug)))

  log(`Wrote ${built.length} ${built.length === 1 ? 'deck' : 'decks'} to src/data/decks.json`)
  if (failures.length > 0) {
    for (const failure of failures) console.error(`\n[decks] failed: ${failure}`)
    process.exitCode = 1
  }
}

function toRecord(deck, rendered) {
  return {
    slug: deck.slug,
    title: deck.title,
    date: deck.date,
    event: deck.event,
    speaker: deck.speaker,
    description: deck.description,
    tags: deck.tags,
    links: deck.links,
    video: deck.video,
    /** 外部でホストされている資料のときだけ、その配布元 */
    source: deck.remote,
    format: deck.format,
    pageCount: rendered.pageCount,
    aspect: rendered.aspect,
    text: rendered.text,
  }
}

/**
 * Put pdf.js's runtime data where the browser can fetch it. Copied rather than
 * imported because Vite only bundles what a module names, and these are looked
 * up by URL at render time.
 */
async function copyPdfjsRuntime() {
  const version = JSON.parse(await fs.readFile(path.join(PDFJS_DIR, 'package.json'), 'utf8')).version
  const stampFile = path.join(PDFJS_OUT_DIR, '.version')
  if (!force && (await fs.readFile(stampFile, 'utf8').catch(() => null))?.trim() === version) return

  await fs.rm(PDFJS_OUT_DIR, { recursive: true, force: true })
  await fs.mkdir(PDFJS_OUT_DIR, { recursive: true })
  for (const dir of PDFJS_RUNTIME_DIRS) {
    await fs.cp(path.join(PDFJS_DIR, dir), path.join(PDFJS_OUT_DIR, dir), { recursive: true })
  }
  await fs.writeFile(stampFile, `${version}\n`, 'utf8')
  log(`pdf.js ${version}: copied ${PDFJS_RUNTIME_DIRS.join(' and ')} to public/pdfjs/`)
}

async function pruneOutputs(keep) {
  let entries
  try {
    entries = await fs.readdir(OUT_DIR, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !keep.has(entry.name)) {
      await fs.rm(path.join(OUT_DIR, entry.name), { recursive: true, force: true })
      log(`${entry.name}: source is gone, output removed`)
    }
  }
}

async function exists(target) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

await main()
