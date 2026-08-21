#!/usr/bin/env node
/**
 * 焼いたデッキの出力を確かめる。
 *
 * build-decks.mjs が緑でも中身が壊れていることがある（sharp や pdf.js の呼び出しを
 * 変えた回、marp-cli の依存を上げた回）。だからファイルの有無ではなく中身を見る —
 * 表紙の標準偏差が 0 なら単色、つまり描画に失敗している。CLAUDE.md が手順書として
 * 書いていた確認を、そのままここに移した。
 *
 *   node scripts/check-decks.mjs [期待する slug...]
 *
 * 形式ごとに見るものが違うので、記録（decks.json）から引いて分岐する。
 * marp と「手元の PDF」が 1 件も無い回は、見るべき経路を通らずに緑になるので落とす。
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { GEN_FILE, OUT_DIR, OUTPUT_CONFIG, SEARCH_FILE } from './decks/config.mjs'
import { exists } from './decks/util.mjs'

/** 単色でないと言える下限。真っ白・真っ黒の描画失敗はちょうど 0 になる */
const MIN_STDDEV = 1

const problems = []
const notes = []

const fail = (message) => problems.push(message)

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))

/** 画像が「絵として成立しているか」。寸法と、単色でないことを見る */
async function checkImage(label, file, expectedWidth) {
  if (!(await exists(file))) {
    fail(`${label}: ${path.relative(OUT_DIR, file)} が無い`)
    return
  }
  const image = sharp(file)
  const { width, height } = await image.metadata()
  if (width !== expectedWidth) {
    fail(`${label}: ${path.basename(file)} の幅が ${width}px（${expectedWidth}px のはず）`)
  }
  const { channels } = await image.stats()
  const stdev = channels.map((channel) => channel.stdev)
  if (!stdev.some((value) => value > MIN_STDDEV)) {
    fail(
      `${label}: ${path.basename(file)} が単色（標準偏差 ${stdev.map((v) => v.toFixed(1)).join('/')}）— 描画に失敗している`,
    )
    return
  }
  notes.push(
    `${label}: ${path.basename(file)} ${width}x${height} σ=${stdev.map((v) => v.toFixed(1)).join('/')}`,
  )
}

async function checkDeck(deck, searchText) {
  const dir = path.join(OUT_DIR, deck.slug)

  // 動画だけのデッキは出力を持たない。持っていたら消し忘れ
  if (deck.format === 'video') {
    if (deck.pageCount !== 0) fail(`${deck.slug}: video なのに pageCount が ${deck.pageCount}`)
    if (!deck.video) fail(`${deck.slug}: video なのに video: が無い`)
    if (await exists(dir)) fail(`${deck.slug}: video なのに ${dir} が残っている`)
    notes.push(`${deck.slug}: video only`)
    return
  }

  if (deck.pageCount < 1) fail(`${deck.slug}: pageCount が ${deck.pageCount}`)

  // よそが配っている資料。表紙 1 枚だけを持ち、PDF も本文も抱えない
  if (deck.source) {
    await checkImage(deck.slug, path.join(dir, 't-1.webp'), OUTPUT_CONFIG.thumbWidth)
    if (await exists(path.join(dir, 'slides.pdf'))) {
      fail(`${deck.slug}: 借りものなのに slides.pdf が残っている`)
    }
    if (searchText !== '') fail(`${deck.slug}: 借りものなのに検索用テキストがある`)
    return
  }

  // 自前のスライド。表紙・全ページのサムネイル・PDF・検索用本文が揃う
  await checkImage(deck.slug, path.join(dir, 'p-1.webp'), OUTPUT_CONFIG.posterWidth)
  if (!(await exists(path.join(dir, 'slides.pdf')))) fail(`${deck.slug}: slides.pdf が無い`)

  const missing = []
  for (let page = 1; page <= deck.pageCount; page += 1) {
    if (!(await exists(path.join(dir, `t-${page}.webp`)))) missing.push(page)
  }
  if (missing.length > 0) {
    fail(`${deck.slug}: サムネイルが欠けている（p.${missing.join(', ')}）`)
  }
  // 1 枚だけ中身も見る。全ページ分の統計は高いが、0 枚だと検査にならない
  await checkImage(deck.slug, path.join(dir, 't-1.webp'), OUTPUT_CONFIG.thumbWidth)

  if (searchText.trim() === '') {
    fail(`${deck.slug}: 検索用テキストが空 — 全文検索に何も載らない`)
  } else {
    notes.push(`${deck.slug}: 検索用テキスト ${searchText.length} 字`)
  }
}

async function main() {
  const expected = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))

  const { decks } = await readJson(GEN_FILE)
  const search = new Map((await readJson(SEARCH_FILE)).map(({ slug, text }) => [slug, text]))

  if (expected.length > 0) {
    const built = new Set(decks.map((deck) => deck.slug))
    for (const slug of expected) {
      if (!built.has(slug)) fail(`${slug}: 焼かれていない（decks.json に無い）`)
    }
    for (const deck of decks) {
      if (!expected.includes(deck.slug)) fail(`${deck.slug}: 期待していないデッキが混ざっている`)
    }
  }

  for (const deck of decks) {
    await checkDeck(deck, search.get(deck.slug) ?? '')
  }

  /*
   * 見るべき経路を通ったかを確かめる。marp も「手元の PDF」も無い回は、
   * 表紙と検索用テキストを作る経路を一度も通らずに緑になってしまう。
   */
  const covered = new Set(decks.filter((deck) => !deck.source).map((deck) => deck.format))
  for (const format of ['marp', 'pdf']) {
    if (!covered.has(format)) {
      fail(`${format} のデッキが 1 件も無い — この形式の経路を通らずに緑になる`)
    }
  }

  for (const note of notes) console.log(`[check-decks] ${note}`)
  if (problems.length > 0) {
    for (const problem of problems) console.error(`[check-decks] ✗ ${problem}`)
    process.exitCode = 1
    return
  }
  console.log(`[check-decks] ${decks.length} 件すべて期待どおり`)
}

await main()
