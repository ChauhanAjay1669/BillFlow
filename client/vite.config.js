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
  'invoices/new',
  'customers',
  'products',
  'excel-import',
  'designer',
  'templates',
  'payments',
  'reports',
  'settings',
  'settings/company',
  'settings/invoice',
  'settings/taxes',
  'settings/bank',
  'settings/security'
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

    // 2. Generate dist/vercel.json for Vercel SPA rewrites
    fs.writeFileSync(
      path.join(distPath, 'vercel.json'),
      JSON.stringify(
        {
          cleanUrls: false,
          rewrites: [{ source: '/(.*)', destination: '/index.html' }]
        },
        null,
        2
      )
    )

    // 3. Generate static route HTML files and directories
    staticRoutes.forEach((route) => {
      const routeDir = path.join(distPath, route)
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true })
      }
      fs.writeFileSync(path.join(routeDir, 'index.html'), indexHtml)

      if (!route.includes('/')) {
        fs.writeFileSync(path.join(distPath, `${route}.html`), indexHtml)
      }
    })

    console.log(`[spa-fallback] Generated 404.html, vercel.json, and ${staticRoutes.length} static route entrypoints`)
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallbackPlugin()],
})