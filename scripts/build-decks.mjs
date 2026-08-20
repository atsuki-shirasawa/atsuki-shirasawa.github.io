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
 *
 * このファイルは組み立てだけを持つ。中身は scripts/decks/ に分けてある。
 *   config  出力の置き場所と、出力を左右する設定（OUTPUT_CONFIG）
 *   meta    frontmatter の読み取りと正規化。形式の判定
 *   pdf     Marp から書く / よそから落とす
 *   render  PDF から静止画と検索用テキストを起こす
 *   cache   作り直すべきかの判断（指紋）
 *   record  decks.json の 1 件と、その形の検査
 *   output  書き出しと後片付け
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import { fingerprint, readCache, writeCache } from './decks/cache.mjs'
import { OUT_DIR } from './decks/config.mjs'
import { findDecks, readMeta } from './decks/meta.mjs'
import { copyPdfjsRuntime, pruneOutputs, writeIndex } from './decks/output.mjs'
import { downloadPdf, marpToPdf } from './decks/pdf.mjs'
import { renderPdf } from './decks/render.mjs'
import { toRecord } from './decks/record.mjs'
import { exists, log, warn } from './decks/util.mjs'

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

/**
 * 前回の結果を使えるのは、指紋が一致していて、かつ前回の出力が実際に残っている
 * ときだけ。.cache/decks.json だけ残って public/decks/ が消えている状態（ignore
 * されているので git clean や checkout で起きる）で、キャッシュを信じてはいけない。
 */
async function cacheUsable(deck) {
  if (deck.format === 'video') return true
  // 借りものは表紙 1 枚しか作らないので、残っているかの目印もそれ
  const marker = deck.remote ? 't-1.webp' : 'p-1.webp'
  return exists(path.join(OUT_DIR, deck.slug, marker))
}

async function resolveDeck(deck, cached) {
  const stamp = await fingerprint(deck.dir)
  if (cached?.stamp === stamp && (await cacheUsable(deck))) {
    log(`${deck.slug}: unchanged, using the cache`)
    return { stamp, rendered: cached.rendered }
  }
  return { stamp, rendered: await buildDeck(deck) }
}

/* ── Main ──────────────────────────────────────────── */

async function main() {
  const force = process.argv.slice(2).includes('--force')
  await copyPdfjsRuntime(force)

  const found = await findDecks()
  if (found.length === 0) {
    warn('No decks found in decks/. Writing an empty index.')
  }

  const cache = await readCache(force)
  const nextCache = {}
  const built = []
  /** 出力を残すデッキ。作れたものと、今回は作れなかったが decks/ にはあるもの */
  const keep = new Set()
  const failures = []

  for (const location of found) {
    let deck
    try {
      deck = await readMeta(location)
    } catch (error) {
      failures.push(error.message)
      keep.add(location.slug)
      continue
    }
    // draft に戻したデッキは出力も消す。公開したままにしないため
    if (deck.draft && process.env.INCLUDE_DRAFTS !== '1') {
      log(`${deck.slug}: draft, skipped`)
      continue
    }

    const cached = cache[deck.slug]
    try {
      const { stamp, rendered } = await resolveDeck(deck, cached)
      nextCache[deck.slug] = { stamp, rendered }
      built.push(toRecord(deck, rendered))
      keep.add(deck.slug)
    } catch (error) {
      keep.add(deck.slug)
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

  await writeIndex(built)
  await writeCache(nextCache)
  // 作れなかったデッキの出力は残す（decks.json からは外れているので誰も参照しない
  // し、次のビルドでやり直せる）。消すのは decks/ から消えたものと draft だけ
  await pruneOutputs(keep)

  log(`Wrote ${built.length} ${built.length === 1 ? 'deck' : 'decks'} to src/data/decks.json`)
  if (failures.length > 0) {
    for (const failure of failures) console.error(`\n[decks] failed: ${failure}`)
    process.exitCode = 1
  }
}

await main()
