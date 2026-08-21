// PDF から、PDF だけでは出せないものを起こす。ページの静止画（カードの絵と
// フィルムストリップ）と、検索用の本文。ページ全体を大きな画像で書き出したり
// しないのは、ビューアが pdf.js で PDF そのものを描くから。
import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas'

import { OUTPUT_CONFIG, PDFJS_DIR } from './config.mjs'
import { warn } from './util.mjs'

// pdfjs reaches for DOM classes Node lacks, so hand it the canvas implementations first
globalThis.DOMMatrix ??= DOMMatrix
globalThis.Path2D ??= Path2D
globalThis.ImageData ??= ImageData

let pdfjsPromise
function loadPdfjs() {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs')
  return pdfjsPromise
}

/**
 * @param {boolean} coverOnly 表紙 1 枚だけをサムネイルにして、本文も残りのページも作らない。
 *   よそから借りている資料に使う
 */
export async function renderPdf(pdfPath, outDir, coverOnly = false) {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await fs.readFile(pdfPath))
  // Dispose through the loading task (PDFDocumentProxy.destroy went away in pdfjs 6)
  const loadingTask = pdfjs.getDocument({
    data,
    standardFontDataUrl: path.join(PDFJS_DIR, 'standard_fonts') + path.sep,
    cMapUrl: path.join(PDFJS_DIR, 'cmaps') + path.sep,
    cMapPacked: true,
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
    const width = isFirst ? OUTPUT_CONFIG.posterWidth : OUTPUT_CONFIG.thumbWidth
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
      .resize({ width: OUTPUT_CONFIG.thumbWidth, withoutEnlargement: true })
      .webp({ quality: 74, effort: 4 })
      .toFile(path.join(outDir, `t-${pageNumber}.webp`))

    if (!coverOnly) {
      const textContent = await page.getTextContent()
      texts.push(joinTextItems(textContent.items))
    }
    page.cleanup()
  }

  await loadingTask.destroy()

  // 黙って切らない。切れた回は「後半が検索に出ない」ので、必ず声に出す
  const full = squash(texts.join('\n'))
  const limit = OUTPUT_CONFIG.searchTextLimit
  if (full.length > limit) {
    warn(
      `${path.basename(outDir)}: 検索用テキストが ${full.length} 字あったので ${limit} 字で切った（以降のページは全文検索に載らない）`,
    )
  }

  return { pageCount, aspect: Number(aspect.toFixed(4)), text: full.slice(0, limit) }
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

/** Collapse whitespace for the search index. 上限は呼ぶ側が OUTPUT_CONFIG から当てる */
function squash(text) {
  return text.replace(/\s+/g, ' ').trim()
}
