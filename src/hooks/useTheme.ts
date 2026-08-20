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
