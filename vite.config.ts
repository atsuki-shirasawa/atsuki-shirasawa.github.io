import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// 拡張子を書くのは vite の native config loader が拡張子なしを解けないため。
// この 2 つは import を持たないので、設定から辿る枝はここで閉じる
import { avatarAlt, identity, metaDescription, siteTitle } from './src/data/identity.ts'
import { THEME_STORAGE_KEY } from './src/lib/theme.ts'

// GitHub Pages のユーザーサイト配信を前提に base を決める。
// 既定は https://atsuki-shirasawa.github.io/
// プロジェクトサイト (…/<repo>/) へ移す場合は BASE_PATH=/<repo>/ を渡す。
const base = process.env.BASE_PATH ?? '/'

/**
 * 共有カードに出す絶対 URL。og:url と og:image は絶対でないとスクレイパが拾わない
 * ので、base を持っているここで組む（src/lib/paths.ts の withBase() と同じ理由）。
 */
const siteOrigin = 'https://atsuki-shirasawa.github.io'
const siteUrl = `${siteOrigin}${base}`

/**
 * カードの画像はプロフィール画像。URL を持っているのは src/data/generated.json
 * だけなので、index.html には写さずここから読む（fetch-content.mjs が付ける
 * ?s= を変えたときに黙ってずれないように）。
 */
const { github } = JSON.parse(readFileSync('./src/data/generated.json', 'utf8'))
const ogImage = github.avatarUrl || `${siteUrl}favicon.svg`

/** 属性値に入れるので & は実体参照にする（アバターの URL は ?v=4&s=240 を持つ） */
const attr = (value: string) => value.replaceAll('&', '&amp;')

/**
 * index.html に写さない値。URL に加えて、題・説明・名前・テーマの鍵もここで入れる —
 * 同じ文字列を 2 箇所に置くと、片方だけ変えたときに黙ってずれる（鍵に関しては
 * 「保存が読まれず初回描画のテーマが外れる」という形で出る）。
 *
 * __THEME_KEY__ だけは属性ではなく <script> の中の文字列リテラルに入る。attr() の
 * 実体参照はそこでは効かないので、鍵に & や引用符を入れてはいけない（src/lib/theme.ts）。
 */
const INJECT: Record<string, string> = {
  __SITE_URL__: siteUrl,
  __OG_IMAGE__: ogImage,
  __TITLE__: siteTitle,
  __DESCRIPTION__: metaDescription,
  __SITE_NAME__: identity.siteName,
  __IMAGE_ALT__: avatarAlt,
  __THEME_KEY__: THEME_STORAGE_KEY,
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'inject-share-meta',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) =>
          Object.entries(INJECT).reduce(
            (out, [token, value]) => out.replaceAll(token, attr(value)),
            html,
          ),
      },
    },
  ],
})
