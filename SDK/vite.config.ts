import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ContentstackChatWidget',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'es' : format}.js`
    },
    rollupOptions: {
      // Externalize React dependencies (they'll be provided by consuming app)
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        // Ensure CSS is extracted
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css';
          return assetInfo.name || 'asset';
        }
      }
    },
    sourcemap: true,
    emptyOutDir: true,
    // Extract CSS into separate file
    cssCodeSplit: false
  },
  css: {
    postcss: {
      plugins: []
    }
  }
});
