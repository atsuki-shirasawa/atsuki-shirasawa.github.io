// 出力の置き場所と、出力を左右する設定。
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../..', import.meta.url))

/**
 * 読むデッキの置き場所。既定は decks/。
 *
 * CI の検証ジョブが DECKS_DIR=decks/_examples を渡して見本だけを焼く。公開デッキは
 * よそでホストされている PDF 1 本しか無く、Marp と手元の PDF の経路は decks/ に
 * 自前のスライドが入るまで一度も通らないため（そこに 3 件のバグが溜まっていた）。
 * 見本を指すぶんには findDecks の `_` 読み飛ばしに触らずに済む — 読み飛ばされるのは
 * decks/_examples 自身で、その中の marp-deck / pdf-deck / video-deck ではない。
 *
 * 注意: キャッシュの鍵は slug だけなので、両方の置き場所に同じ slug があると
 * 取り違える。検証ジョブは前の成果物を復元しない前提で走らせる。
 */
export const DECKS_DIR = path.resolve(root, process.env.DECKS_DIR ?? 'decks')
export const OUT_DIR = path.join(root, 'public', 'decks')
export const PDFJS_OUT_DIR = path.join(root, 'public', 'pdfjs')
export const GEN_FILE = path.join(root, 'src', 'data', 'decks.json')
export const SEARCH_FILE = path.join(root, 'public', 'decks-search.json')
export const CACHE_FILE = path.join(root, '.cache', 'decks.json')
export const PDFJS_DIR = path.join(root, 'node_modules', 'pdfjs-dist')
export const MARP_BIN = path.join(root, 'node_modules', '@marp-team', 'marp-cli', 'marp-cli.js')

/**
 * marp-cli に読ませる一時ファイルの名前。デッキのディレクトリの中に置く（相対パスの
 * 画像を解決させるため）ので、fingerprint() はこれを数に入れてはいけない。
 * 名前を 2 箇所に書くと片方だけ直して自分の中間生成物を指紋に混ぜてしまうので、
 * 書く側（pdf.mjs）と除く側（cache.mjs）が同じ定数を見る。
 */
export const MARP_TMP_NAME = '.marp-build.md'

/**
 * 出力の見た目・寸法・ファイル構成を左右する設定は、ここだけに置く。
 * fingerprint() がこのオブジェクトを丸ごとハッシュに混ぜるので、項目を足しても
 * 「ハッシュに入れ忘れて、既存デッキが全部キャッシュに当たり続ける」が起きない。
 * 出力に関係ない値をここに置くと余分な再生成を招くが、黙って古い出力を配り
 * 続けるよりは安い。
 */
export const OUTPUT_CONFIG = {
  /** 出力の作り方を変えたら上げる。全デッキのキャッシュが無効になる */
  version: 'portfolio-2',
  /** 1 ページ目。カードの絵であり、ビューアが pdf.js を待つあいだの表示 */
  posterWidth: 1600,
  /** フィルムストリップとカードのめくりプレビュー */
  thumbWidth: 480,
  /**
   * 1 デッキぶんの検索用テキストの上限。ここを超えたぶんは全文検索に載らない
   * （越えたら build-decks が警告する）。出力を左右するので必ずここに置く
   */
  searchTextLimit: 20000,
}

/**
 * pdf.js が実行時に取りに来るデータ。cmaps は CJK の符号化を埋め込まず参照して
 * いる PDF のため、standard_fonts は base-14（Helvetica, Times）を書き出さない
 * 変換器のため。どちらも必要な PDF のときだけ取りに行くので、全部埋め込んである
 * デッキには一切費用がかからない。無いとそういう PDF が白紙のグリフで出る。
 */
export const PDFJS_RUNTIME_DIRS = ['cmaps', 'standard_fonts']
