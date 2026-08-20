<!-- @format -->

## Portfolio

React + Vite で作ったポートフォリオサイトを GitHub Pages で公開しています。

**https://atsuki-shirasawa.github.io/**

記事（Zenn / Qiita）と GitHub のコントリビューションはビルド時に各サービスから取得し、
登壇スライドは `decks/` に置いた Markdown（Marp）と PDF からビルド時に生成しています（毎朝 6:00 JST に再ビルド）。

### スライド

`decks/<slug>/index.md` を追加して push すると、一覧・ビューア・PDF ダウンロードが増えます。
デッキの中身は 4 通りの置き方ができます。

| 置き方 | 書くこと |
| --- | --- |
| Markdown（Marp） | 本文をそのまま書く。`---` がページ区切り |
| 手元の PDF | PDF を同じディレクトリに置き、`pdf: slides.pdf` |
| よそにある PDF | `pdf: https://example.com/talk.pdf`（ビルド時に取得） |
| スライド無し・動画だけ | 本文と `pdf:` を書かず、`video:` だけ |

```markdown
---
title: 発表タイトル
date: 2026-07-30
event: 社内 LT
speaker: Atsuki Shirasawa
description: 一覧とカードに出る 1〜2 文。
tags: [Astro, Marp]
pdf: slides.pdf   # PDF を置くときだけ書く。無ければ Marp デッキ
video: https://www.youtube.com/watch?v=xxxxxxxxxxx&t=2s   # 発表動画があるとき
---
```

書き出しの下敷きは `decks/_examples/` に置いてあります。`_` で始まるディレクトリは
ビルドが読み飛ばすので公開されません。Marp・手元の PDF・録画だけ、の 3 通りが入っているので、
`decks/<slug>/` にコピーして書き換えるのが早いです。

`video:` を書くと、デッキのページにスライドと並べて発表動画が出ます。
`watch` / `youtu.be` / `embed` / `live` のどの形の URL でも受け付け、`t=` の開始位置も引き継ぎます。
再生するまで YouTube のプレイヤーは読み込まず、サムネイルだけを置いておきます。
本文も `pdf:` も無いデッキは「動画だけの登壇」として扱われます。カードには動画のサムネイルが出て、
押すとそのまま YouTube へ飛びます。

`pdf:` に URL を書いた場合は、よそが配っている資料としてビルド時に一度だけ取得し、
**表紙 1 枚のサムネイルだけ**を残して PDF は捨てます。カードもダウンロードボタンも
自サイトのコピーではなく**配布元**に向きます（全文検索の対象にもなりません）。
取得に失敗しても、前回の成果物が残っていればそれで公開を続けます（ビルドは止まりません）。
なお他者が配っている資料を載せるときは、公開してよいかを自分で確認してください。

`scripts/build-decks.mjs` が Markdown と PDF の違いを吸収して **PDF 1 本**に揃え、
ページ画像とスライド本文（検索用）を書き出します。ビューアはその PDF を
ブラウザ上で pdf.js が描くので、文字を選択でき、スライド内のリンクも生きています。

- Marp デッキのビルドには Chrome か Chromium が必要です（見つからないときは `CHROME_PATH` を渡す）
- 生成物（`public/decks/`、`public/pdfjs/`、`src/data/decks.json`、`public/decks-search.json`）は
  すべて `decks/` から再生成されるので直接編集しません
- 出力の見た目を変えたときは `build-decks.mjs` の `PIPELINE_VERSION` を上げないと、
  キャッシュが効いて変更が反映されません

<details>
<summary>開発メモ</summary>

```bash
npm install
npm run dev            # decks をビルドしてから開発サーバー
npm run decks          # decks/ を正規化（Marp → PDF → ページ画像 → 本文抽出）
npm run fetch:content  # Zenn / Qiita / GitHub を取り直して src/data/generated.json を更新
npm run build          # decks + fetch:content + 型チェック + 本番ビルド

node scripts/build-decks.mjs --force   # キャッシュを無視して全デッキ再生成
```

| パス | 役割 |
| --- | --- |
| `src/data/profile.ts` | 経歴・技術スタック・プロフィール（手動更新） |
| `src/data/generated.json` | Zenn / Qiita / GitHub / slides から自動生成（コミット済みでフォールバックも兼ねる） |
| `scripts/fetch-content.mjs` | 上記 JSON を生成するスクリプト |
| `decks/<slug>/index.md` | 登壇スライドの原稿とメタデータ |
| `scripts/build-decks.mjs` | デッキを PDF・ページ画像・検索テキストに正規化 |
| `src/lib/slideViewer.ts` | pdf.js でスライドを描くビューアの中身（React 非依存） |
| `.github/workflows/deploy.yml` | ビルドと Pages へのデプロイ（push / 日次 / 手動） |

コントリビューションのヒートマップは GitHub GraphQL API を使うため認証が必要です。
ローカルでは `gh auth token` を自動で借り、CI では `secrets.GH_PAT`（無ければ `GITHUB_TOKEN`）を使います。

プロジェクトサイト（`…/<repo>/`）へ移す場合は `BASE_PATH=/<repo>/ npm run build` でビルドします。

</details>
