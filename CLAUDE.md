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

直すのは入力側 — `decks/<slug>/index.md`、`scripts/decks/`（`scripts/build-decks.mjs`
は組み立てだけ）、`scripts/fetch-content.mjs`、`src/data/profile.ts`（経歴・技術
スタックは手動更新）。

## デッキのビルドは「静かに古くなる」

`scripts/decks/cache.mjs` が `.cache/decks.json` にデッキディレクトリの
フィンガープリント（バイト列の sha256）を持ち、一致すれば再生成を飛ばす。

**出力を左右する設定は `scripts/decks/config.mjs` の `OUTPUT_CONFIG` に置く。**
`fingerprint()` はこのオブジェクトを丸ごとハッシュに混ぜるので、項目を足しても
「混ぜ忘れて既存デッキが全部キャッシュに当たる」は起きない。逆に、ここに置かない
値で出力が変わるようにすると、その変更は既存デッキに一度も届かない。

**出力の作り方を変えたら `OUTPUT_CONFIG.version` を上げる。** 設定の値ではなく
コード（sharp の呼び出し、pdf.js の描画、ファイル構成）を変えたときは、指紋が
変わらないのでこれが唯一の無効化手段。

mtime は混ぜない（git checkout が復元しないため CI で毎回ミスする）。

パイプラインを触ったら `deck-pipeline-reviewer` サブエージェントでレビューする。

### scripts/decks/ の分担

| ファイル | 持ちもの |
| --- | --- |
| `config.mjs` | 出力先のパスと `OUTPUT_CONFIG`。`MARP_TMP_NAME` もここ |
| `meta.mjs` | frontmatter の読み取りと正規化、4 形式の判定 |
| `pdf.mjs` | Marp から書く / よそから落とす |
| `render.mjs` | PDF から静止画と検索用テキストを起こす |
| `cache.mjs` | 指紋と `.cache/decks.json` |
| `record.mjs` | `decks.json` の 1 件（`toRecord`）と形の検査（`assertRecord`） |
| `output.mjs` | `decks.json` / `decks-search.json` / `public/pdfjs/` の書き出しと後片付け |
| `build-decks.mjs` | 組み立てだけ（`buildDeck` / `resolveDeck` / `main`） |

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
- `src/lib/` は React 非依存（`slideViewer.ts` は pdf.js を直接触る）。
  `src/hooks/` は振る舞い、`src/components/` は描画。集計や判定を `.tsx` に置かない

置き場所が決まっているもの:

| やりたいこと | 通す場所 |
| --- | --- |
| デッキの見せ方で分岐する | `src/lib/deckView.ts` の `DeckView`。`format === 'video'` を直に見ない |
| デッキへのリンクを置く | `<DeckLink deck>`（外か中かを判断する） |
| 外部リンクを置く | `<ExternalLink>`（`target` / `rel` を書かない） |
| タグのチップを置く | `<DeckTags>`、または `global.css` の `.chip` |
| ページ番号を丸める | `src/lib/page.ts` の `clampPage` / `parsePageParam` |
| 現在年を読む | `src/lib/time.ts` の `currentYear`（`new Date()` を書かない） |
| クエリを書き換える | `useQueryUpdate()`（常に `replace`） |
| 静的ファイルの URL を作る | `src/lib/paths.ts` の `withBase()` |
