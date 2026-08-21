# atsukish-portfolio

React 19 + Vite 8 + TypeScript の静的ポートフォリオ。GitHub Pages のユーザーサイト
（https://atsuki-shirasawa.github.io/）に配信している。テストは無い。
品質の門は **`biome lint` と `tsc -b`** の 2 枚（どちらも `npm run build` が通る）。

## コマンド

```bash
npm run dev            # decks をビルドしてから開発サーバー
npm run decks          # decks/ を正規化（Marp → PDF → ページ画像 → 本文抽出）
npm run fetch:content  # Zenn / Qiita / GitHub を取り直して src/data/generated.json を更新
npm run lint           # biome lint
npm run typecheck      # tsc -b --noEmit
npm run build          # decks + fetch:content + biome lint + tsc -b + vite build
npm run build:only     # 外部取得を飛ばして lint・型チェック・vite build のみ

node scripts/build-decks.mjs --force   # キャッシュを無視して全デッキ再生成
```

## 検査の 2 枚

**`tsc -b`（`src/` だけ）。** `noUncheckedIndexedAccess` を入れてある。添字と
`Map.get` に `undefined` が付くので、`src/lib/` の集計は「空でも落ちない」形で
書く（`ordered[0]?.from ?? end` のように）。`!` は置かない — biome が止める。

**`biome lint`（`src/` と `scripts/` の両方）。** 設定は `biome.jsonc`。
`scripts/` は tsconfig の include の外なので、ここが唯一の網になる。

- **整形は入れていない**（`formatter.enabled: false`）。家の作法に合わせて掛けると
  14 ファイルが動き、marp の argv が 9 行に展開されるなど可読性が下がる方向の差が
  混ざる。入れるなら一度に全ファイルへ
- `a11y/noRedundantRoles` は切ってある。Tailwind の preflight が全リストに
  `list-style: none` を敷き、WebKit はそれでリストのロールを落とす（Safari +
  VoiceOver で「N 項目」が読まれない）ので、`<ul role="list">` は冗長ではない
- 抑制は `// biome-ignore <rule>: <理由>` を**診断が指す行の直前**に置く。
  JSX では属性の直前（開始タグの中）に書く — **子要素の位置に `//` を置くと
  コメントではなく可視テキストになる**（一度やった）
- `typescript-eslint` は使えない。peer が `typescript <6.1.0` で、このリポジトリは
  7 系。パーサが実行時に停止する（`typescript-eslint#10940`）。biome は独自パーサ
  なので影響を受けず、`.tsx` の `useExhaustiveDependencies` まで見られる

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
変わらないので、**手元ではこれが唯一の無効化手段**（`.cache/decks.json` を消す
以外に）。

CI にはもう 1 枚受け皿がある。`deploy.yml` のキャッシュ鍵が
`decks-<コードのハッシュ>-<デッキのハッシュ>` の 2 段で、`restore-keys` は前の段
までを接頭辞にしている。だから `scripts/decks/` を触った回は前の成果物を拾えず、
version を上げ忘れても作り直しになる。**接頭辞に入れるのが要点** — コードのハッシュ
を後ろの段だけに置くと、厳密鍵が空振りしても `restore-keys` が古いものを復元して
しまい、指紋が「変わっていない」と言うので何も起きない（一度そう書いて踏んだ）。

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
- ルーティングはハッシュ（`/#/slides/<slug>`）。Pages に SPA フォールバックが無いため。
  **代償は共有カードが 1 組しか持てないこと** — フラグメントはサーバーに届かないので、
  スクレイパが読むのは `index.html` だけ。デッキごとのカードを出すには、デッキごとの
  静的 HTML を焼いてハッシュをやめる（`404.html` の SPA フォールバック）必要がある
- 共有カード（`og:*` / `twitter:card`）と `theme-color` は `index.html`。絶対 URL は
  スクレイパが相対を拾わないので、`base` を持っている `vite.config.ts` が
  `__SITE_URL__` / `__OG_IMAGE__` に入れる（`&` は実体参照にする）。
  `theme-color` は `useTheme` が実際の `--bg` を読んで書き換えるので、色をここに写さない
- スライドのキーボード操作は `document` で受けるが、**奪うキーは選ぶ**。`←` `→` と
  `F` は常に効かせ、`Space` / `PageUp` / `PageDown` / `Home` / `End` は全画面のときだけ
  （通常表示のデッキ詳細は下に本文が続くので、奪うとキーボードで読み進められない）
- 検索用テキストの上限は `OUTPUT_CONFIG.searchTextLimit`。超えたら
  `[decks] ⚠` が出る（黙って後半が検索から消えないように）

## pdf.js は黙って形が変わる

ビューアは `pdfjs-dist` を直接触る唯一の場所。**自前の構造型に寄せない** —
`import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist'`
を使う（`import type` は消えるので、pdf.js が先読みで束ねられることはない）。

自前の型に寄せていたころ、6 系への変更を 2 つ取りこぼしていた。どちらも
例外にならず、静かに効かなくなるだけだった:

- **`PDFDocumentProxy.destroy` が消えた。** `void doc?.destroy?.()` は optional call
  なので no-op になり、デッキを離れてもワーカーとドキュメントが残っていた。
  捨てるのは `getDocument()` が返す**読み込みタスク側**（`render.mjs` は対応済みで、
  ブラウザ側だけ取り残されていた）
- **`isEvalSupported` が消えた。** 渡しても無視される。両バンドルに 1 件も無い

`rawDims` は公開型にあるが `Object` なので、要る 4 つを名指しした型で受ける。
`page.render()` の `canvas` は必須項目。

pdf.js の描画は `requestAnimationFrame` を回す。**不可視タブでは完了しない**ので、
自動化した Chrome で「`data-state` が `ready` にならない」のはバグではない
（`document.visibilityState` を先に見る）。

## 依存関係

`npm audit fix --force` を**使わない**。marp-cli の周りで往復するだけになる。

| marp-cli | 出る脆弱性 | npm が言う fix |
| --- | --- | --- |
| 4.5.0 | `extract-zip`（high 4 件） | 2.4.0 にしろ |
| 2.4.0 | `tar-fs` 3 件 + `ws` 3 件（計 9 件） | 4.5.0 にしろ |

どちらも「fix available」と出るので、`--force` を 2 回叩くと元に戻る。実際に一度
2.4.0 まで落ちていた（9 件のほうが悪い）。

**正解は上流で連鎖を切ること。** `package.json` の `overrides` で
`puppeteer-core` を `^25.8.0` に上げてある。理由:

- 連鎖は `marp-cli → puppeteer-core → @puppeteer/browsers → extract-zip`
- `extract-zip` に修正版は無い（advisory は `*`）。`@puppeteer/browsers@3.x` が
  依存ごと捨てている（いまは `yargs` と `modern-tar` だけ）
- marp-cli 4.5.0 は `puppeteer-core@^24` を要求するが、24 系が引くのは
  `@puppeteer/browsers@2.13.2` で、こちらは `extract-zip` を持つ
- `@puppeteer/browsers` を直接 3.x に上げる手もあるが、puppeteer-core は
  そこから 13 個のシンボルを使っていて面が広い。marp-cli が puppeteer-core に
  求めるのは起動と PDF 出力だけなので、**上げるなら puppeteer-core 側**。
  25.8.0 は `@puppeteer/browsers@3.2.1` をピン留めしていて、組で出ている版

override を触ったら **Marp デッキが焼けるかを実際に確かめる**（型検査もビルドも
marp-cli を通らないので、壊れても緑になる）。`decks/_examples/marp-deck` を
コピーして `node scripts/build-decks.mjs --force`。見るのは PDF のバイト数だけでは
足りない — 表紙 `p-1.webp` の標準偏差が 0 なら単色、つまり描画に失敗している。

## CSS の置き方

Tailwind v4（`@tailwindcss/vite`）と CSS Modules の混成。**ファイル単位で分ける** —
1 つのコンポーネントの中で両方は使わない。レイヤーの都合で勝ち負けの向きが逆に
なるため（下記）。

| ファイル | 持ちもの |
| --- | --- |
| `src/styles/global.css` | パレット（`:root` / `html[data-theme='dark']`）、`@layer base` の要素既定、ページの骨格（`.app` `.wrap` `.main` `.section*`） |
| `src/styles/theme.css` | `@theme` のトークンと `@utility` の意匠部品。**新しい値はまずここに名前を付ける** |
| `*.module.css` | 3 本だけ残す（下記） |

### 値を足すとき

`text-[13px]` のような生の値を書かない。`theme.css` に名前を付けてから使う。
既定の語彙は `--color-* / --text-* / --breakpoint-*: initial` で捨ててあるので、
`text-sm` や `gray-500` は存在しない（`text-body` と同義の名前を増やさないため）。

- **読ませる字は用途で呼ぶ** — `micro`(10) `meta`(11) `note`(12) `label`(13)
  `body`(14) `lead`(15) `strong`(16)。1px 刻みなので大きさでは選べない
- **見せる字は寸法で呼ぶ** — `display-2xs`(17) 〜 `display-3xl`(52)。
  20px は Hero のリード文と GitHub の数字、34px は Hero の名前と年間
  コントリビューションで共有されていて、用途名を付けるとどちらかが嘘になる
- **行送りは字の大きさで決まる** — 読ませる字（16px 以下）は `leading-prose`(1.7)、
  見せる字は 17〜20px が `leading-lead`(1.55)、28px 以上が `leading-title`(1.4)。
  「字が大きくなるほど詰める」の 1 本しかないので、迷ったら大きさを見る
- **総大文字の字送りは `tracking-caps`(0.1em) だけ**。段は作らない
- 名前を付けるのは **2 箇所以上で同じ意味で使う値だけ**。1 箇所しかない光学的な
  微調整（ロゴの字送り、ツールチップの行送り）は arbitrary value でよい。
  ただし**なぜその値か**をコメントに残す
- **テーマで変わる値だけ `@theme inline`** に置く。変わらない値（書体・ガラス・
  寸法）は `@theme` 本体。inline に置くと `--font-sans: var(--font-sans)` の
  自己参照になる。逆に、`@theme` 本体に置いた値は `:root` にも出るので
  CSS Modules 側から `var(--color-glass)` で引ける
- `global.css` 側と同じ名前にはできない。`--shadow-card` → `shadow-lift`、
  `--glass` → `--color-glass` のように名前を変えて橋を渡す

### 踏んだ罠

- **`@layer base` から出すと utility が効かない。** レイヤー外の規則は utility
  より常に強い。`a:hover { text-decoration: underline }` を素で書くと
  `hover:no-underline` が負ける。逆に、ページの骨格クラスはレイヤーに入れない
  （CSS Modules もレイヤー外なので、入れると module が必ず勝つようになる）
- **同じ詳細度の utility は class 属性の並びで決まらない。** 共通文字列に
  `text-muted` を置いて active 側で `text-fg` を足すのは効かない。勝つのは
  生成 CSS の並び。**状態ごとに書き切る**
- **`@utility` の名前は Tailwind の名前空間を避ける。** `fill-accent` と書くと
  組み込みの `fill-*`（SVG の塗り）も同名で生成され、`fill:` が余分に付く。
  `fill / stroke / bg / text / border / accent / ring / shadow / outline` は使わない
- **入れ子の `color-mix()` は arbitrary value に書けない。** グラデーションの
  停止位置として解釈され、`16%` が落ちてべた塗りになる
  （`before:bg-[radial-gradient(...)]` で踏んだ）。`@utility` か module に出す
- **`opacity` で文字を落とさない。** 状態で地色と文字色が変わる場所では比が保証
  できない。Slides のタグの件数が `opacity-55` で 2.85:1 だった（light の rest）。
  ホバー時はラベル自身が 4.96:1 しかないので、**何 % にしても 4.5:1 を割る**。
  状態で変わらないトークンに固定する（`--muted` は 6 状態の最悪で 4.76:1、
  `--faint` はチップの地では 3.71:1 で全滅）
- **`focus:outline-none` を置かない。** utility は `@layer base` に勝つので、
  `:focus-visible` の輪（2px の accent）が消えて枠線色の変化しか残らない
- **辺を指定する。** `border-t border-line` は 4 辺に色を置く。`border-t-line`
- **折り返し点の境界を混ぜない。** `max-width: 720px` はちょうど 720px を含み、
  `max-narrow`（`width < 45rem`）は含まない。CSS 側も `width < Nrem` で書く
- Tailwind のスキャナはコメントや無関係な識別子からも候補を作る。`container`
  という語が `slideViewer.ts` にあるだけで `.container` の規則が 6 本出る（無害）

### CSS Modules で残す 3 本

**module を選ぶ基準は 1 つ。utility に移すと arbitrary value が増えるだけのとき。**
arbitrary value には**なぜその値かを書く場所が無い**ので、1 回きりの値ばかりの
ものを移すと、名前を付けるためにやった移行が逆回しになる。

`@keyframes` は残る理由にならない（`--animate-*` として `@theme` に置ける。
`page-turn` がそうなっている）。「@media が要る」「子孫セレクタが要る」も違う
（`max-narrow:` と `group-hover:` / `group-data-*:` がある）。

| ファイル | 移すと増える arbitrary |
| --- | --- |
| `SlideViewer.module.css` | そもそも移せない。pdf.js が実行時に作る DOM（`:global(.textLayer)`）に className を渡せない |
| `CareerTrack.module.css` | 9 個。cubic-bezier 2 つ、`clip-path` 2 つ、`color-mix()` の破線色、点の `box-shadow`、字送り、レーンの位置（162px）と節目の高さ（23.5px）。ほぼ全部が 1 回きりの絶対配置 |
| `Carousel.module.css` | 3 つ + 1 回しか使わない `@utility`（`::-webkit-scrollbar` に変種が無い）。レールの 12 宣言も他に出てこない |

`CareerTrack.module.css` は **`CareerTrack.tsx` と `Career.tsx` の両方が import する**。
Hero の横のトラックと CAREER の縦のレーンは 1 枚の同じ図で、破線＝測量済み /
実線＝進行中という様式を共有している。別ファイルに割ると必ず片方だけずれる。
向きは折り返しても揃う — Hero は左から右へ古い順で右端が現在、CAREER は新しい順に
並ぶので上端が現在。どちらも「実線の側が今」で読める。

逆に、**module に残っていても共有できるものは共有する**。矢印の線
（`fill: none` / `stroke: currentColor` / 太さ / 端の丸め）は 2 つの module が
同じ 5 宣言を写していたので、`ChevronIcon` に持たせて寸法だけ残した。
アイコンは**線か塗りかを自分で持ち、寸法と色は置いた側**が持つ。

### 分かっている残り

- 再生のガラス円は `PlayBadge` に 1 つ。同じ絵を 3 つの大きさで使う
  （記章 26 / カード 56 / 埋め込み 68）。的の 2 つは 56 と 68 で残してある —
  載る面の幅が違う（カード 286px と版面いっぱい）ので、揃えるとどちらかが崩れる
- CSS は導入前より増えている（gzip 7.1KB → 9.4KB）。この設計はほとんどの指定が
  1 箇所しか出てこないので、utility の「1 宣言 1 セレクタ」が module より高くつく。
  得ているのは可読性と保守性で、バイト数ではない

## コードの書き方

既存に合わせる。

- セミコロンなし、シングルクォート、2 スペース
- コメントは日本語で **なぜそうしたか**を書く。何をしているかはコードが言う
- `src/lib/` は React 非依存（`slideViewer.ts` は pdf.js を直接触る）。
  `src/hooks/` は振る舞い、`src/components/` は描画。集計や判定を `.tsx` に置かない
- 状態から見た目を引くときは表にする（`GitHubActivity` の `HEAT`、`Writing` の
  `siteColor`）。`[data-level='N']` を CSS に 5 本並べるより短く、`Record` に
  すれば埋め忘れを型が言う

置き場所が決まっているもの:

| やりたいこと | 通す場所 |
| --- | --- |
| デッキの見せ方で分岐する | `src/lib/deckView.ts` の `DeckView`。`format === 'video'` を直に見ない |
| デッキへのリンクを置く | `<DeckLink deck>`（外か中かを判断する） |
| 外部リンクを置く | `<ExternalLink>`（`target` / `rel` を書かない） |
| タグのチップを置く | `<DeckTags>`、または `chip` |
| 版面で囲む | `wrap`（`container` ではない — Tailwind の組み込みとぶつかる） |
| 節を作る | `section` / `section-head` / `section-title` |
| 節見出しの右にリンクを置く | `section-links`（箱は容器の `> a` が持つ。リンク側は `text-muted` と hover の色だけ — **色は容器に置けない**、レイヤー外なので utility の hover が負ける） |
| 左に固定幅・右に中身の行を作る | `section-row`（CAREER / TECH STACK / WRITING 共通） |
| 罫線の箱をホバーで浮かせる | `lift` |
| 塗りのボタンを置く | `solid-accent`（地色と文字色が対で付く。`#fff` を書かない） |
| ディスプレイ書体を張る | `display-title` / `display-metric` |
| メディアに文字や記章を重ねる | `bg-glass` / `text-on-media`、または `var(--color-glass)` |
| 再生のガラス円を置く | `<PlayBadge kind>`（`mark` 26 / `card` 56 / `embed` 68。的は囲みの `group` に反応する） |
| 指の当たり判定を広げる | `tap` |
| 読み上げにだけ渡す | `visually-hidden` |
| ページ番号を丸める | `src/lib/page.ts` の `clampPage` / `parsePageParam` |
| 現在年を読む | `src/lib/time.ts` の `currentYear`（`new Date()` を書かない） |
| タブの題を決める | `usePageTitle()`（ページで `useEffect` と `document.title` を書かない） |
| 経歴から数や位置を出す | `src/lib/career.ts` の `careerLegs()` / `careerTrack()`。Hero のトラックと CAREER のレーンは同じ読みを共有する |
| Zenn / Qiita の色とアイコンを引く | `src/components/sites.ts` の `SITES`（`text-zenn` や `ZennIcon` を直に書かない） |
| 記事を新しい順に並べる | `src/data/content.ts` の `posts`（すでに降順。`.tsx` で sort しない） |
| クエリを書き換える | `useQueryUpdate()`（常に `replace`） |
| 静的ファイルの URL を作る | `src/lib/paths.ts` の `withBase()` |
| 共有カードの絶対 URL を組む | `vite.config.ts`（`siteOrigin` + `base`）。`index.html` に URL を写さない |
