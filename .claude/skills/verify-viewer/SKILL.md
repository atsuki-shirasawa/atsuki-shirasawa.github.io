---
name: verify-viewer
description: SlideViewer を実際のブラウザで検証する。decks/ に Marp か手元の PDF のデッキを置いた回に使う。dev を起こして data-state・pdf.worker の取得回数・テキストの選択・フィルムストリップを順に見て、最後に片付ける。型検査もビルドも CI も「動くか」を見ないので、ここだけが唯一の検証。
---

# ビューアが実際に動くかを見る

`src/lib/slideViewer.ts` + `SlideViewer.module.css` で 770 行あまり、コードの 15% ほどが
pdf.js との境界にある。**そこには自動テストが 1 件も無く**、`tsc -b` も `biome lint` も
`vite build` も CI の `verify-decks` も「動くか」を見ない。過去のバグ 6 件のうち **4 件は
ブラウザでしか出なかった**。

だから `decks/` に **Marp か手元の PDF**（remote PDF と動画のみは `SlideViewer` に
到達しない）を足した回は、必ずこの手順を通す。

## 0. 何を通すか決める

`decks/` に到達するデッキがあるか確認する:

```bash
# decks.json は配列ではなく { "decks": [...] } なので .decks[] から入る
jq -r '.decks[] | "\(.slug) format=\(.format) source=\(.source // "-")"' src/data/decks.json
```

`source` が付いているもの（よそにある PDF）と `format=video` は**除く** — 表紙 1 枚か
YouTube の埋め込みで終わるので、pdf.js の経路を通らない。

残りが 0 件なら、見本を借りる（Chrome が要らないので手元で確実に通る）:

```bash
cp -R decks/_examples/pdf-deck decks/pdf-deck
```

**借りたことを覚えておく。最後の片付けで消す。**

## 1. dev を起こす

```bash
npm run dev
```

`npm run decks` が先に走る（remote PDF の取得に行くので、オフラインだと前回の
レンダリングで続行する旨の警告が出るが、それで構わない）。出力に出た実際のポートを
使う。既定は 5173。URL はハッシュルーティング:

```
http://localhost:5173/#/slides/<slug>
```

## 2. ブラウザを開く

ツールが未読み込みなら 1 回でまとめて取る:

```
ToolSearch: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_network_requests,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__tabs_close_mcp
```

`tabs_context_mcp` → `tabs_create_mcp` で新しいタブに開く。既存タブは使わない。

**記録は測る前に張る。** `read_network_requests` と `read_console_messages` は
**呼んだ時点から**記録を始めるので、あとから読むと 0 件になり、「静かだった」のか
「録れていなかった」のか区別が付かない。開いたら先に両方を `clear: true` で 1 回呼び、
そのうえで読み込み直す（クエリを変えた URL — `?run=1#/slides/<slug>` — にすると
ハッシュだけの変更にならず、本当に読み込み直せる）。

読み終わったあとに「0 件」を根拠にするときは、`console.log('[probe] alive')` を 1 本
流して読み返し、**記録が生きていること**を示してから 0 件と書く。

## 3. 先に可視性を見る（ここを飛ばすと嘘の結論が出る）

```js
document.visibilityState
```

**`'visible'` でなければ、この先の測定は全部無意味。** pdf.js の描画は
`requestAnimationFrame` を回すので、背面のタブでは:

- 初回描画が完了しないことがある（`data-state` が `loading` のまま）— バグではない。
  ただし**完了してしまうこともある**ので、`ready` に達したことを可視性の代わりに
  使ってはいけない（実測: `hidden` のまま `ready` になった）
- **ページを送っても描き替わらない**。`draw()` が終わらないので `show()` が待ち続け、
  canvas は前のページのまま残る。例外は出ないので「2 ページ目以降で固まる」という
  嘘の結論が出る（一度そう読んだ）

`'hidden'` なら、タブを前面に出してから測り直す。

## 4. 見る 6 項目

| 見るもの | 期待 | 取り方 |
| --- | --- | --- |
| `data-state` | `ready` になる | `document.querySelector('[aria-roledescription="slide deck"]').dataset.state` |
| ページを送ったときの `pdf.worker` と `slides.pdf` の取得回数 | **増えない** | `read_network_requests`（下記） |
| デッキを離れたあと | ワーカーが残らない | 下記（人の目が要る） |
| スライドの文字 | 選択・コピーできる | `document.querySelector('.textLayer').childElementCount > 0` と、実際に選択してみる |
| スライド内のリンク | 押せる | PDF がリンクを持つときだけ。無ければ「対象外」と報告する |
| フィルムストリップの番号 | 非選択のページでも読める | スクリーンショットを見る（薄くするのは絵だけ） |

### 取得回数の測り方

いちばん壊れやすいのはここ（`useEffect` の依存に `go` を足すと、ページ送りごとに
エンジンが作り直される）。

1. 基準を取る。`read_network_requests` を張ってあれば `pattern:
   "pdf\\.worker|slides\\.pdf"` で数える。張り忘れたときは
   `performance.getEntriesByType('resource')` から数えれば読み込み時のぶんも取れる
2. **実際のキー操作かクリックでページを送る** — `computer` で `[data-nav="next"]` を
   クリックするか `ArrowRight` を押す
3. もう一度数える。**件数が同じなら合格**

**dev の基準値は StrictMode で 2 倍出る。** `main.tsx` が `<StrictMode>` なので effect が
二重にマウントされ、エンジンも 2 つ作られる。実測の基準は
`pdf.worker` が 3 件（`?url` の import 1 + 本体 6.7MB + 304 の 300B）、`slides.pdf` が
2 件。**これは正常** — 見るのは絶対値ではなく「送っても増えないこと」。
デッキを離れて戻る往復では、論理 1 回のマウントにつき **+2** される。

**`javascript_tool` のループでページ送りを測ってはいけない。** JS で `go()` 相当を
呼ぶと、実際に通したい経路（`useSlideKeys` の keydown、`sent` ref、`data-nav` の
click）を丸ごと飛ばして React の state だけ動かすことになり、**連打の取りこぼしも
キーの取り合いも検出できない**。**送るのは実操作、JS は描き終わったあとの読み取りだけ。**

（CLAUDE.md は「JS を注入するたびにタブが背面へ回る」とも書いているが、実測では
`visibilityState` は `visible` を保った。環境で変わるので、**毎回の読み取りに `vis` を
含めて**、背面に回ったかどうかを測定のたびに確かめる。）

送ったあとに `p[aria-live="polite"]` の `N / M` が動いていることと、canvas の中身が
変わっていることをスクリーンショットで確かめる。

### 離脱後のワーカー

ページ内の JS からワーカーの生存は見えない。取れるのは「作り直していないか」まで:

```js
performance.getEntriesByType('resource').filter(r => r.name.includes('pdf.worker')).length
```

デッキ → 一覧（`#/slides`）→ 同じデッキと往復して、**1 往復で 1 増える**なら
エンジンの作り直しは 1 回。ここが 2 以上増えるなら依存配列を疑う。

**残っているかどうかは人が見る** — DevTools の Sources > Threads、または
`chrome://process-internals`。合わせて `read_console_messages` を読み、離脱後に
`[viewer] pdf.js could not open the deck` や late reject が出ていないことを確かめる
（離脱時の「Loading aborted」を掴んで、もう外れた画面に `failed` を撃った事故がある）。

### 速く送る

矢印キーを**連打**して、押した回数どおり進むか見る（`useSlideKeys` が `page` を
閉じ込めていると取りこぼす）。送った直後にテキストが消えていないかも見る
（`paintText` が `TextLayer.cancel()` を呼んでいないと、古い層の後片付けが今のページの
文字を消す）。

### 全画面

`F` を押して全画面にし、`Space` / `PageDown` / `Home` / `End` が効くこと、
全画面を抜けたら **効かなくなる**ことを見る（通常表示で奪うとキーボードで
本文を読み進められない）。

**合成した `Escape` では全画面を抜けられない。** Chrome は全画面の解除に本物の
ユーザー操作を要求するので、`computer` の `Escape` を送っても
`document.fullscreenElement` は残る。そのまま `Space` を押すと当然効くので、
**「全画面外でも Space が奪われている」という嘘の指摘が出る**（一度そう読みかけた）。
抜けるのはアプリ側のトグル（`f` をもう一度）で、**毎回 `document.fullscreenElement` が
`null` になったことを確かめてから**通常表示側を測る。

## 5. 片付け

```bash
# dev サーバーを止める
# 借りた見本を消す（0 で cp したときだけ）
rm -rf decks/pdf-deck
npm run decks
```

`npm run decks` で生成物を元に戻す。`git status` が汚れていないことを確認して終わる
（`src/data/decks.json` と `public/decks/` は ignore 対象なのでコミットには影響しないが、
手元の状態は戻す）。

## 6. 報告

6 項目それぞれを ✅ / ❌ / 対象外 で表にする。**測っていない項目を ✅ にしない** —
とくに「離脱後のワーカー」は人が DevTools を見ていなければ「未確認」と書く。
`document.visibilityState` が `visible` だったことも書き添える。
