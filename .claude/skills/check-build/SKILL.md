---
name: check-build
description: ポートフォリオのビルドが健全かを診断する。Chrome の有無、gh の認証、外部取得の成否、生成物の鮮度を順に確かめる。ビルドが通ったのに内容が古い・反映されないときに使う。
---

# ビルドの健全性を診断する

このビルドは **失敗しても前回の成果物で続行する** 設計になっている。
`scripts/fetch-content.mjs` は取得に失敗するとコミット済みの `src/data/generated.json` を残し、
`scripts/build-decks.mjs` は remote PDF の取得に失敗すると前回のレンダリングを使う。
つまり「成功したのに古い」状態があり得る。緑のログを鮮度の証拠にしない。

順に確かめて、最後に**何が新鮮で何が古いか**を表にして報告する。

## 1. 前提コマンド

```bash
node -v                 # CI は 22
command -v gh && gh auth status
"${CHROME_PATH:-$(command -v google-chrome || command -v chromium || echo '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')}" --version
```

- Chrome / Chromium が無いと **Marp デッキだけ**落ちる。PDF デッキと動画デッキは通る。
  見つからないときは `CHROME_PATH` を渡す
- `gh auth token` が無いと **コントリビューションのヒートマップだけ**が古くなる。
  GitHub GraphQL は認証必須。`GITHUB_TOKEN` / `GH_TOKEN` 環境変数でも代用できる

## 2. 外部取得を実際に走らせる

```bash
npm run fetch:content
```

`[fetch-content] ⚠` の警告が出た項目が、古いまま据え置かれた部分。
Zenn / Qiita / GitHub のどれが落ちたかを警告文から拾う。

```bash
git diff --stat src/data/generated.json    # 更新されたか
```

## 3. デッキを走らせる

```bash
npm run decks
```

- `unchanged, using the cache` → フィンガープリントが一致してスキップされた。
  `decks/` を触っていないなら正常
- `前回の内容で続行します` → remote PDF の取得に失敗。古い成果物が出ている
- 出力の見た目を変えたのに反映されないときは
  `scripts/decks/config.mjs` の `OUTPUT_CONFIG.version` を上げるか
  `node scripts/build-decks.mjs --force`

## 4. 生成物の鮮度を見る

```bash
ls -la src/data/generated.json src/data/decks.json public/decks-search.json
ls public/decks/
jq 'keys' .cache/decks.json
jq '. | length' src/data/decks.json
```

`decks/` にあるディレクトリ数（`_` 始まりと draft を除く）と `src/data/decks.json` の
要素数が合っているか。合わなければ `npm run decks` のログに `failures` が出ている。

## 5. 通しで確認する

```bash
npm run build          # decks + fetch:content + tsc -b + vite build
npm run preview
```

プロジェクトサイトへ移すなら `BASE_PATH=/<repo>/ npm run build`。
ユーザーサイト（`<user>.github.io`）はルート配信なので `BASE_PATH=/`。

## 報告のしかた

| 項目 | 状態 | 根拠 |
| --- | --- | --- |
| 記事（Zenn / Qiita） | 新鮮 / 古い | fetch-content のログ |
| コントリビューション | 新鮮 / 古い | 認証の有無と警告 |
| デッキ（各 slug） | 再生成 / キャッシュ / 前回の内容 | decks のログ |
| 型 | 通る / 落ちる | `npm run typecheck` |

古い項目には原因（認証・Chrome・ネットワーク）と直し方を添える。
「ビルドは通った」だけで終わらせない。
