// PDF をどこから持ってくるか。Marp なら marp-cli に書かせ、URL なら落としてくる。
// 手元に置かれた PDF はそのまま使うので、ここには来ない。
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import matter from 'gray-matter'

import { MARP_BIN, MARP_TMP_NAME } from './config.mjs'
import { log } from './util.mjs'

const execFileAsync = promisify(execFile)

/** よそから落とす PDF の上限 */
const MAX_REMOTE_BYTES = 60 * 1024 * 1024

/** Marp が読まない、こちら側のためだけの frontmatter */
const NOT_DIRECTIVES = [
  'pdf',
  'tags',
  'event',
  'speaker',
  'draft',
  'links',
  'date',
  'description',
  'video',
]

/**
 * Write the PDF with marp-cli. The temporary file it reads carries the added
 * `marp: true` and sits in the deck's own directory, so relative image paths
 * still resolve.
 */
export async function marpToPdf(deck, pdfOut) {
  const raw = await fs.readFile(deck.indexPath, 'utf8')
  const { data, content } = matter(raw)
  const directives = {
    ...data,
    marp: true,
    theme: data.theme ?? 'default',
    paginate: data.paginate ?? true,
  }
  for (const key of NOT_DIRECTIVES) delete directives[key]

  const tmpPath = path.join(deck.dir, MARP_TMP_NAME)
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
export async function downloadPdf(url, target) {
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
