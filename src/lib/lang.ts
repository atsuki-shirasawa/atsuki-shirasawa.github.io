// ページ全体は英語（index.html の lang="en"）だが、記事や登壇のタイトルは
// 書いたときの言語のまま載せる。読み上げに正しい声を選ばせるため、
// タイトル要素だけ lang を付け替える。

/** 漢字・ひらがな・カタカナ */
const JAPANESE = /[぀-ヿ㐀-䶿一-鿿]/

/** 見出し 1 本の言語。日本語の文字が混ざっていれば ja、それ以外は en */
export function textLang(text: string): 'ja' | 'en' {
  return JAPANESE.test(text) ? 'ja' : 'en'
}
