/*
 * 名前と肩書き、そこから組む題と説明。profile.ts の一部だが、ここだけ切り出して
 * import を 1 つも持たない形にしてある — vite.config.ts が読むファイルだからで、
 * vite の native config loader は拡張子なしの import を解けない（拡張子を書かない
 * のはこのリポジトリの作法なので、設定から辿る枝だけを import 無しで閉じる）。
 *
 * 同じ文字列を index.html に写さない。写すと片方だけ変わる。
 */
export const identity = {
  name: 'Atsuki Shirasawa',
  /**
   * 肩書き。Hero は総大文字で出すが、字面は CSS の uppercase に任せて
   * ここには 1 通りだけ置く（index.html の題も同じ字面から組む）。
   */
  role: 'Machine Learning Engineer',
  siteName: 'atsukish.dev',
} as const

/** タブと og:title に出す題 */
export const siteTitle = `${identity.name} — ${identity.role}`

/** <meta name="description"> と og:description */
export const metaDescription = `Portfolio of ${identity.name} — ${identity.role.toLowerCase()}. Production ML and MLOps work, tech articles and conference slide decks.`

/** Hero のプロフィール画像と og:image:alt */
export const avatarAlt = `${identity.name}'s GitHub avatar`
