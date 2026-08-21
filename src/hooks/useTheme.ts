import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'atsukish-theme'

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  // index.html のインラインスクリプトが初期描画前に data-theme を確定させている
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // ブラウザの外枠を地色に合わせる。色は CSS から読む — ここに #fafaf8 を
    // 書くと、パレットが global.css とここの 2 箇所になる
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // プライベートモードなどで保存できなくても表示は継続する
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, isDark: theme === 'dark', toggleTheme }
}
