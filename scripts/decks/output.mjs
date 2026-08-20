// 書き出しと後片付け。
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  GEN_FILE,
  OUT_DIR,
  PDFJS_DIR,
  PDFJS_OUT_DIR,
  PDFJS_RUNTIME_DIRS,
  SEARCH_FILE,
} from './config.mjs'
import { assertRecord } from './record.mjs'
import { log } from './util.mjs'

/**
 * メタデータと検索用テキストを別に書く。本文は誰かが検索するまで要らないので、
 * JS のバンドルに載せず、そのときに取りに行かせる。
 */
export async function writeIndex(records) {
  for (const record of records) assertRecord(record)

  const meta = records.map(({ text: _text, ...rest }) => rest)
  const searchText = records.map(({ slug, text }) => ({ slug, text }))

  await fs.mkdir(path.dirname(GEN_FILE), { recursive: true })
  await fs.writeFile(GEN_FILE, `${JSON.stringify({ decks: meta }, null, 2)}\n`, 'utf8')
  await fs.mkdir(path.dirname(SEARCH_FILE), { recursive: true })
  await fs.writeFile(SEARCH_FILE, `${JSON.stringify(searchText)}\n`, 'utf8')
}

/**
 * Put pdf.js's runtime data where the browser can fetch it. Copied rather than
 * imported because Vite only bundles what a module names, and these are looked
 * up by URL at render time.
 */
export async function copyPdfjsRuntime(force) {
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

/** Clear out the output of decks that no longer exist */
export async function pruneOutputs(keep) {
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
