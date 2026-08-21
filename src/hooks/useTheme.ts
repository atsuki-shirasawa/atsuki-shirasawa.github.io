import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'atsukish-theme'

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  // index.html のインラインスクリプトが初期描画前に data-theme を確定させている
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  /** トグルが押されたか。押されるまで保存しない（下の effect の理由を見る） */
  const chosen = useRef(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // ブラウザの外枠を地色に合わせる。色は CSS から読む — ここに #fafaf8 を
    // 書くと、パレットが global.css とここの 2 箇所になる
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)

    /*
     * 保存するのは押されたあとだけ。初回描画でも保存すると、トグルを一度も
     * 押していない訪問者に atsukish-theme が書かれ、index.html の
     * 「saved が無ければ prefers-color-scheme を見る」が二度と通らなくなる。
     * OS を dark から light に変えてもサイトが付いてこないまま固定される。
     */
    if (!chosen.current) return
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // プライベートモードなどで保存できなくても表示は継続する
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    chosen.current = true
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, isDark: theme === 'dark', toggleTheme }
}
