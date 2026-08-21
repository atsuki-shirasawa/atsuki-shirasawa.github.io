// profile.ts の経歴から、Hero の横トラックと CAREER の縦レーンが実際に描くものを
// 起こす。入力は profile.ts と currentYear で、どちらもビルド時に決まる — 描画ごとに
// 数え直す理由が無いので 1 度だけ評価する（useMemo(…, []) は依存配列が空になるだけで、
// 何も守らない）。
//
// 集計そのものは src/lib/career.ts。ここは「評価済みの値を src/data/ から出す」側で、
// content.ts の posts / calendar と同じ置き方。
import { careerLegs, careerTrack } from '../lib/career'

/** CAREER の縦レーン。profile.ts の並び（新しい順）のまま */
export const legs = careerLegs()

/** Hero の横トラック。古い順に並べ直した位置と目盛り */
export const track = careerTrack()
