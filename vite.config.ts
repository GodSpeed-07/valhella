import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome116',
    modulePreload: false,
    rollupOptions: {
      input: {
        sidepanel: 'src/sidepanel/index.html',
        onboarding: 'src/onboarding/index.html',
        offscreen: 'src/offscreen/index.html',
        background: 'src/background/index.ts'
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'
      }
    }
  }
})
