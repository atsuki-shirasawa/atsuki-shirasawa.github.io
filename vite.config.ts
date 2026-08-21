import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
          html.replaceAll('__SITE_URL__', attr(siteUrl)).replaceAll('__OG_IMAGE__', attr(ogImage)),
      },
    },
  ],
})
