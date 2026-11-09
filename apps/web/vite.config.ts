import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const allowedHosts = (process.env.DEV_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: allowedHosts.length > 0 ? allowedHosts : undefined,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
})
