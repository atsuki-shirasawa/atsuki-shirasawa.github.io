# デッキの書き方サンプル

`_` で始まるディレクトリは `scripts/build-decks.mjs` が読み飛ばすので、ここに置いた
ものは公開されない。デッキを追加するときの下敷きとして持っておくためのもの。

使うときは中身を `decks/<slug>/` にコピーする。ディレクトリ名がそのまま URL
（`/#/slides/<slug>`）になるので、`2026-07-slide-pages-intro` のように日付を頭に付ける。

| サンプル | 置き方 | カードを押したとき |
| --- | --- | --- |
| `marp-deck/` | 本文を Marp の Markdown で書く。`---` がページ区切り | 内部のビューアで開く |
| `pdf-deck/` | PDF を隣に置いて `pdf: slides.pdf` | 内部のビューアで開く |
| `video-deck/` | 本文も `pdf:` も書かず `video:` だけ | YouTube へ飛ぶ |

よそが配っている PDF を載せるときは `pdf:` に URL を書く（`pdf-deck/` の `pdf:` を
`https://example.com/talk.pdf` に差し替えるだけ）。この場合こちらでは PDF を抱えず、
表紙 1 枚だけをサムネイルにして、カードからは配布元へ送る。

フロントマターで使えるキーは `title`（必須）、`date`、`event`、`speaker`、
`description`、`tags`、`links`、`pdf`、`video`、`draft`、`theme`、`paginate`。
書式の詳細はリポジトリ直下の `README.md` を参照。
