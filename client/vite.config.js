import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const staticRoutes = [
  'login',
  'register',
  'forgot-password',
  'onboarding',
  'dashboard',
  'invoices',
  'customers',
  'products',
  'excel-import',
  'designer',
  'templates',
  'payments',
  'reports',
  'settings'
]

const spaFallbackPlugin = () => ({
  name: 'spa-fallback-generator',
  closeBundle() {
    const distPath = path.resolve(__dirname, 'dist')
    const indexPath = path.join(distPath, 'index.html')
    if (!fs.existsSync(indexPath)) return

    const indexHtml = fs.readFileSync(indexPath, 'utf-8')

    // 1. Generate 404.html for universal SPA fallback
    fs.writeFileSync(path.join(distPath, '404.html'), indexHtml)

    // 2. Generate static route HTML files and directories (login.html, login/index.html, etc.)
    staticRoutes.forEach((route) => {
      fs.writeFileSync(path.join(distPath, `${route}.html`), indexHtml)
      const routeDir = path.join(distPath, route)
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true })
      }
      fs.writeFileSync(path.join(routeDir, 'index.html'), indexHtml)
    })

    console.log(`[spa-fallback] Generated 404.html and ${staticRoutes.length} static route entrypoints`)
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallbackPlugin()],
})