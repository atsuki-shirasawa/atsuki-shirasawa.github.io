---
title: GitHub Pages でスライドを共有する
date: 2026-07-30
event: 社内 LT
speaker: Atsuki Shirasawa
description: Markdown と PDF のどちらでもスライドを置ける、GitHub Pages 上のスライド共有サイトの仕組み。
tags:
  - Marp
  - GitHub Pages
theme: default
paginate: true
links:
  - label: Marp 公式
    url: https://marp.app/
---

<!-- _class: lead -->

# GitHub Pages で<br />スライドを共有する

Markdown でも PDF でも置けるスライド置き場

---

## なぜ作るのか

- 登壇資料が Google Drive や手元の Keynote に散らばる
- 共有したいのは「URL 1本」だけ
- スライドは**成果物**なので、コードと同じ場所で履歴を残したい

---

## 仕組み

置き方は 4 通り。どれも同じ成果物に正規化される。

| 置くもの | ビルド時の処理 |
| --- | --- |
| `index.md`（Marp） | marp-cli で PDF 化 → ページ画像 |
| `slides.pdf` | そのまま配信 → ページ画像 |
| `pdf:` に URL | 取得して表紙だけ作り、配布元へ送る |
| `video:` だけ | 何も作らず、カードから YouTube へ送る |

---

## ディレクトリ構成

```text
decks/
  2026-07-slide-pages-intro/
    index.md          # Marp デッキ
  2026-05-design-review/
    index.md          # メタだけ書く
    slides.pdf        # 本体
  2025-11-summit-recording/
    index.md          # video: だけ書く
```

ディレクトリ名がそのまま URL になる。

---

## メタ情報は frontmatter で

```yaml
---
title: GitHub Pages でスライドを共有する
date: 2026-07-30
event: 社内 LT
tags: [Astro, Marp]
pdf: slides.pdf   # PDF デッキのときだけ書く
---
```

`pdf:` があれば PDF デッキ、なければ Marp デッキ。

---

## できること

- 一覧・タグ絞り込み・スライド本文までの全文検索
- キーボードとスワイプで動くビューア（pdf.js なので文字を選択できる）
- PDF ダウンロード
- 発表動画の埋め込み（押すまで YouTube を読み込まない）
- よそが配っている PDF の取り込み

---

## 公開の流れ

1. `decks/` にディレクトリを追加する
2. `main` に push する
3. GitHub Actions がビルドして Pages に公開する

手元では `npm run dev` でそのまま確認できる。

---

<!-- _class: lead -->

## 置いて、push するだけ

あとは URL を渡す
