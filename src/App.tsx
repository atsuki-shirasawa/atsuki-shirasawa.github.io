import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Slides from './pages/Slides'
import DeckDetail from './pages/DeckDetail'
import { useTheme } from './hooks/useTheme'

/**
 * ルートを移ったら先頭へ戻す。HashRouter + <Routes> にはスクロール管理が一切
 * 入らない（react-router の useScrollRestoration はデータルータの context を
 * 要求する）し、一致する id を持たないハッシュ遷移ではブラウザも動かないので、
 * 一覧を下まで見てから移ると次のページの途中に着地する。
 *
 * 見るのは pathname だけ。search を依存に入れてはいけない — ?p= と ?q= は
 * useQueryUpdate が replace で書くので、ページ送りと 1 文字入力ごとに先頭へ飛ぶ。
 */
function ScrollToTop() {
  const { pathname } = useLocation()

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname は本体で読まないが、変わったことが動く合図。提案どおり外すと初回描画の 1 回しか動かない
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <HashRouter>
      <ScrollToTop />
      <div className="app">
        <Header isDark={isDark} onToggleTheme={toggleTheme} />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/slides" element={<Slides />} />
            <Route path="/slides/:slug" element={<DeckDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}
