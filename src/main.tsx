import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

// index.html の #root。無ければ何も出せないので、黙って落ちずに理由を残す
const root = document.getElementById('root')
if (!root) throw new Error('index.html に #root がありません')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
