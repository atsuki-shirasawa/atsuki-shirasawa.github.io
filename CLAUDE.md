# atsukish-portfolio

React 19 + Vite 8 + TypeScript の静的ポートフォリオ。GitHub Pages のユーザーサイト
（https://atsuki-shirasawa.github.io/）に配信している。テストとリンタは無い。
品質の門は `tsc -b` だけ。

## コマンド

```bash
npm run dev            # decks をビルドしてから開発サーバー
npm run decks          # decks/ を正規化（Marp → PDF → ページ画像 → 本文抽出）
npm run fetch:content  # Zenn / Qiita / GitHub を取り直して src/data/generated.json を更新
npm run typecheck      # tsc -b --noEmit
npm run build          # decks + fetch:content + tsc -b + vite build
npm run build:only     # 外部取得を飛ばして型チェックと vite build のみ

node scripts/build-decks.mjs --force   # キャッシュを無視して全デッキ再生成
```

## 生成物は直接編集しない

これが一番踏みやすい罠。以下は `decks/` か外部サービスから再生成されるので、
直接直しても次のビルドで消える（エラーも出ない）。

| 生成物 | 作る人 | git |
| --- | --- | --- |
| `src/data/decks.json` | `scripts/build-decks.mjs` | ignore |
| `public/decks/` | 同上 | ignore |
| `public/decks-search.json` | 同上 | ignore |
| `public/pdfjs/` | 同上（`node_modules/pdfjs-dist` からコピー） | ignore |
| `.cache/decks.json` | 同上（フィンガープリント） | ignore |
| `src/data/generated.json` | `scripts/fetch-content.mjs` | **コミット済み**（取得失敗時のフォールバック） |

直すのは入力側 — `decks/<slug>/index.md`、`scripts/build-decks.mjs`、
`scripts/fetch-content.mjs`、`src/data/profile.ts`（経歴・技術スタックは手動更新）。

## デッキのビルドは「静かに古くなる」

`scripts/build-decks.mjs` は `.cache/decks.json` にデッキディレクトリの
フィンガープリント（バイト列の sha256）を持ち、一致すれば再生成を飛ばす。

**出力の見た目・寸法・ファイル構成を変えたら `PIPELINE_VERSION` を上げる。**
上げないと既存デッキは全部キャッシュに当たり、新しいコードが一度も走らない。
`fingerprint()` は `PIPELINE_VERSION` / `POSTER_WIDTH` / `THUMB_WIDTH` をハッシュに
混ぜているので、出力を左右するパラメータを増やしたらそこにも足す。
mtime は混ぜない（git checkout が復元しないため CI で毎回ミスする）。

パイプラインを触ったら `deck-pipeline-reviewer` サブエージェントでレビューする。

## 失敗しても止まらない設計

外部依存の失敗はビルドを落とさず、前回の成果物で公開を続ける。

- `fetch-content.mjs`: Zenn / Qiita / GitHub のどれかが落ちたら、コミット済みの
  `generated.json` の該当部分を残す（`[fetch-content] ⚠` が出る）
- `build-decks.mjs`: `pdf:` に URL を書いた remote デッキの取得が落ちたら、
  前回のレンダリングで続行する

したがって **ビルドが緑でも内容が古いことがある**。鮮度を確かめるときは
`/check-build` を使う。

## デッキの 4 形式

`decks/<slug>/index.md` を置くと一覧・ビューア・PDF・全文検索が増える。
ディレクトリ名がそのまま URL（`/#/slides/<slug>`）。`_` と `.` 始まりは読み飛ばす
（`decks/_examples/` は公開されない見本）。

| 置き方 | frontmatter | 判定 |
| --- | --- | --- |
| Marp | 本文を書く。`---` がページ区切り | `pdf:` 無し + 本文あり |
| 手元の PDF | `pdf: slides.pdf` | `pdf:` あり |
| よそにある PDF | `pdf: https://…` | `pdf:` が http(s)。表紙 1 枚だけ残し配布元へ送る |
| 動画のみ | `video:` のみ | 本文も `pdf:` も無い |

`title` は必須。値に `#` を含めるならクォートで囲む（裸だと YAML のコメント）。
追加は `/new-deck` を使う。

## その他の前提

- Marp デッキの PDF 化に **Chrome か Chromium が必要**。無いときは `CHROME_PATH` を渡す。
  PDF デッキと動画デッキは Chrome 無しでも通る
- GitHub のコントリビューションは GraphQL なので**認証が必要**。ローカルは
  `gh auth token` を自動で借り、CI は `secrets.GH_PAT`（無ければ `GITHUB_TOKEN`）
- 静的ファイルの URL は文字列で組み立てず `src/lib/paths.ts` の `withBase()` を通す。
  プロジェクトサイトへ移したとき（`BASE_PATH=/<repo>/`）に壊れる
- ルーティングはハッシュ（`/#/slides/<slug>`）。Pages に SPA フォールバックが無いため

## コードの書き方

既存に合わせる。

- セミコロンなし、シングルクォート、2 スペース
- CSS Modules（`Foo.tsx` に `Foo.module.css`）
- コメントは日本語で **なぜそうしたか**を書く。何をしているかはコードが言う
- `src/lib/` は React 非依存（`slideViewer.ts` は pdf.js を直接触る）
