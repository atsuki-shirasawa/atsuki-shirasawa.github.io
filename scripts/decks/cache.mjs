// デッキ 1 件を作り直すべきかの判断。
//
// ここが効きすぎると、ビルドは緑のまま古い出力を配り続ける（このパイプラインの
// 壊れ方はほぼこれ）。だから指紋には OUTPUT_CONFIG を丸ごと混ぜる。設定を足した
// ときに混ぜ忘れる余地を残さないため。
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { CACHE_FILE, MARP_TMP_NAME, OUTPUT_CONFIG } from './config.mjs'

/**
 * デッキのディレクトリを中身から指紋する。
 * mtime ではなくバイト列を見る。git checkout は mtime を復元しないので、混ぜると
 * CI では毎回キャッシュを外す。
 */
export async function fingerprint(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true })
  const files = entries
    // 自分が置いた中間ファイルは数に入れない
    .filter((entry) => entry.isFile() && entry.name !== MARP_TMP_NAME)
    .map((entry) => path.join(entry.parentPath ?? entry.path ?? dir, entry.name))
    .sort()

  const hash = createHash('sha256')
  hash.update(JSON.stringify(OUTPUT_CONFIG))
  for (const file of files) {
    hash.update(path.relative(dir, file))
    hash.update(await fs.readFile(file))
  }
  return hash.digest('hex')
}

export async function readCache(force) {
  if (force) return {}
  try {
    return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

export async function writeCache(next) {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true })
  await fs.writeFile(CACHE_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}
