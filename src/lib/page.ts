// ページ番号の丸め方。URL の ?p= / ビューアのページ送り / pdf.js の描画要求の
// 3 箇所が同じ規則で動く必要があるので、ここに 1 本だけ置く。

/** 1..total に収める。total が 0（動画だけのデッキ）でも 1 を返す */
export function clampPage(page: number, total: number): number {
  return Math.min(Math.max(Math.trunc(page), 1), Math.max(total, 1))
}

/** ?p= の解釈。数字として読めないものは 1 ページ目 */
export function parsePageParam(value: string | null, total: number): number {
  const page = Number(value ?? '1')
  return Number.isFinite(page) ? clampPage(page, total) : 1
}
