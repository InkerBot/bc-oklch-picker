import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    modulePreload: false,
    sourcemap: 'hidden',
    rolldownOptions: {
      input: 'src/main.ts',
      output: {
        entryFileNames: '[name].js',
      },
    }
  },
  server: {
    cors: {
      origin: '*',
    }
  }
})
