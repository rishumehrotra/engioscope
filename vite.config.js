import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import reactRefresh from '@vitejs/plugin-react-refresh';

// https://vitejs.dev/config/
export default defineConfig({
  // This changes the output dir from dist to build
  // comment this out if that isn't relevant for your project
  build: {
    outDir: '../dist/ui'
  },
  root: 'ui',
  plugins: [
    reactRefresh(),
    legacy({
      targets: ['defaults', 'ie >= 11', 'chrome >= 60'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:1337/'
    }
  }
});
