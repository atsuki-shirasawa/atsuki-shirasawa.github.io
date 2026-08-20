import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Slides from './pages/Slides'
import DeckDetail from './pages/DeckDetail'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <HashRouter>
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
