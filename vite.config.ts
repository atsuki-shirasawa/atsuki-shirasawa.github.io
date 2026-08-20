import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages のユーザーサイト配信を前提に base を決める。
// 既定は https://atsuki-shirasawa.github.io/
// プロジェクトサイト (…/<repo>/) へ移す場合は BASE_PATH=/<repo>/ を渡す。
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
