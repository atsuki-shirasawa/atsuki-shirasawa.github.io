---
name: new-deck
description: 登壇スライドを decks/<slug>/index.md として追加する。Marp / 手元の PDF / よそにある PDF / 動画のみの 4 形式に対応し、frontmatter を埋めて npm run decks で検証するところまでやる。
disable-model-invocation: true
---

# 登壇スライドを追加する

`decks/<slug>/index.md` を 1 つ足すと、一覧・ビューア・PDF ダウンロード・全文検索が増える。
生成物には触らない。`decks/` に置くものだけが入力。

## 1. 形式を決める

ユーザーに聞くか、渡された材料から判断する。

| 材料 | 形式 | `index.md` に書くこと |
| --- | --- | --- |
| 本文を Markdown で書く | `marp` | frontmatter + 本文（`---` がページ区切り） |
| 手元に PDF がある | `pdf` | frontmatter に `pdf: slides.pdf`、PDF を同じディレクトリに置く |
| よそが配っている PDF | `pdf`（remote） | frontmatter に `pdf: https://…` |
| 録画だけ残っている | `video` | frontmatter に `video:` のみ。本文も `pdf:` も書かない |

`scripts/build-decks.mjs` の `readMeta()` が判定する規則そのまま:
`pdf:` があれば PDF デッキ、無くて本文があれば Marp、どちらも無ければ動画のみ。

## 2. slug を決める

ディレクトリ名がそのまま URL（`/#/slides/<slug>`）になる。
`2026-07-slide-pages-intro` のように **日付を頭に付ける**（`YYYY-MM-` か `YYYY-MM-DD-`）。
`_` と `.` で始まる名前はビルドが読み飛ばすので使わない。

## 3. 下敷きをコピーする

```bash
cp -r decks/_examples/marp-deck  decks/<slug>    # Marp
cp -r decks/_examples/pdf-deck   decks/<slug>    # 手元の PDF
cp -r decks/_examples/video-deck decks/<slug>    # 動画のみ
```

`decks/_examples/` は公開されない見本置き場。よそにある PDF を載せるときは
`pdf-deck/` をコピーして `pdf:` を URL に差し替え、`slides.pdf` は消す。

## 4. frontmatter を埋める

使えるキー: `title`（**必須**）、`date`、`event`、`speaker`、`description`、
`tags`、`links`、`pdf`、`video`、`draft`、`theme`、`paginate`。

```yaml
---
title: 発表タイトル
date: 2026-07-30
event: 社内 LT
speaker: Atsuki Shirasawa
description: 一覧とカードに出る 1〜2 文。
tags: [Marp, GitHub Pages]
pdf: slides.pdf                                   # PDF デッキのときだけ
video: https://www.youtube.com/watch?v=xxxx&t=2s   # 録画があるとき
---
```

注意点:

- 値に `#` を含めるときはクォートで囲む（`event: 'Retail Tech Meetup #12'`）。
  裸だと YAML のコメントになって切り落とされる
- `video:` は `watch` / `youtu.be` / `embed` / `live` のどれでも受ける。`t=` も引き継ぐ
- 書きかけは `draft: true`。ビルドから外れる（`INCLUDE_DRAFTS=1` で入れられる）
- よそが配っている資料を載せるときは、公開してよいかユーザーに確認する

## 5. 検証する

```bash
npm run decks    # 正規化。Marp デッキには Chrome / Chromium が必要
```

`[decks] <slug>: …` のログと、生成物が出ているかを見る。

```bash
ls public/decks/<slug>/         # slides.pdf, p-1.webp, t-*.webp（remote は t-1.webp だけ）
jq '.[] | select(.slug=="<slug>")' src/data/decks.json
```

失敗するとき:

- `no index.md, skipped` → ディレクトリ名か配置が違う
- `frontmatter is missing title` → `title` が無い
- `has no slides` → 本文も `pdf:` も `video:` も無い
- Marp が落ちる → Chrome が見つからない。`CHROME_PATH=/path/to/chrome npm run decks`

見た目まで確認するなら `npm run dev` で `/#/slides/<slug>` を開く。

## 6. コミットする

`decks/<slug>/` のみをコミットする。`public/decks/`・`src/data/decks.json`・
`public/decks-search.json` は `.gitignore` 済みの生成物なので追加しない。
push すれば GitHub Actions がビルドして Pages に出る。
