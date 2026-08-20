// src/data/decks.json に並ぶ 1 件。src/types.ts の Deck と 1 対 1 で対応する。
//
// TypeScript 側は `as Deck[]` と信じているだけなので、ここと types.ts がずれても
// 誰も気づかない（画面が静かに崩れる）。書き出す前に形を確かめて、合わなければ
// 落とす。外部要因ではなくこちらのバグなので、ここは前回の内容で凌がない。

export function toRecord(deck, rendered) {
  return {
    slug: deck.slug,
    title: deck.title,
    date: deck.date,
    event: deck.event,
    speaker: deck.speaker,
    description: deck.description,
    tags: deck.tags,
    links: deck.links,
    video: deck.video,
    /** 外部でホストされている資料のときだけ、その配布元 */
    source: deck.remote,
    format: deck.format,
    pageCount: rendered.pageCount,
    aspect: rendered.aspect,
    text: rendered.text,
  }
}

const isText = (value) => typeof value === 'string'
const orNull = (value, test) => value === null || test(value)

export function assertRecord(record) {
  const problems = []
  const check = (ok, field) => {
    if (!ok) problems.push(field)
  }

  check(isText(record.slug) && record.slug.length > 0, 'slug')
  check(isText(record.title) && record.title.length > 0, 'title')
  check(orNull(record.date, isText), 'date')
  check(orNull(record.event, isText), 'event')
  check(orNull(record.speaker, isText), 'speaker')
  check(isText(record.description), 'description')
  check(Array.isArray(record.tags) && record.tags.every(isText), 'tags')
  check(
    Array.isArray(record.links) &&
      record.links.every((link) => isText(link?.label) && isText(link?.url)),
    'links',
  )
  check(
    orNull(
      record.video,
      (video) =>
        video?.provider === 'youtube' && isText(video.id) && typeof video.start === 'number',
    ),
    'video',
  )
  check(orNull(record.source, isText), 'source')
  check(['marp', 'pdf', 'video'].includes(record.format), 'format')
  check(Number.isInteger(record.pageCount) && record.pageCount >= 0, 'pageCount')
  check(Number.isFinite(record.aspect) && record.aspect > 0, 'aspect')
  check(isText(record.text), 'text')

  if (problems.length > 0) {
    throw new Error(
      `${record.slug ?? '(slug 不明)'}: src/types.ts の Deck に合わない項目がある — ${problems.join(', ')}`,
    )
  }
}
