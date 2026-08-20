/**
 * 現在年。読み込み時に 1 度だけ決める。フッタ・CAREER・経歴ラインが別々に
 * new Date() を読むと、年をまたぐ瞬間に表示が食い違う。
 */
export const currentYear = new Date().getFullYear()
