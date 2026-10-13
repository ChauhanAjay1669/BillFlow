import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const spaFallbackPlugin = () => ({
  name: 'spa-fallback-404',
  closeBundle() {
    const distPath = path.resolve(__dirname, 'dist')
    const indexPath = path.join(distPath, 'index.html')
    const fallbackPath = path.join(distPath, '404.html')
    if (fs.existsSync(indexPath)) {
      fs.copyFileSync(indexPath, fallbackPath)
      console.log('[spa-fallback] Created dist/404.html for Vercel SPA routing')
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallbackPlugin()],
})