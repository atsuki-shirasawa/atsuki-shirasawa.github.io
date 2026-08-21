/**
 * テーマの保存先。useTheme と index.html のインラインスクリプト（初期描画前に
 * data-theme を確定させる側）が同じ鍵を見なければならない。片方だけ変えると、
 * 保存が読まれなくなって初回描画のテーマが黙って外れる — 例外も出ない。
 *
 * index.html には写さず、vite.config.ts が __THEME_KEY__ に入れる。
 * <script> の中の文字列リテラルに入るので、鍵に使えるのは英数とハイフンだけ。
 */
export const THEME_STORAGE_KEY = 'atsukish-theme'
