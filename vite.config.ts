import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const backendPort =
    process.env.BACKEND_PORT ||
    process.env.SERVER_PORT ||
    process.env.PORT ||
    '3002';
  const backendTarget =
    process.env.VITE_DEV_API_TARGET ||
    `http://127.0.0.1:${backendPort}`;
  // Environment validation (only log in development)
  if (mode === 'development') {
    if (process.env.VITE_API_URL && process.env.VITE_API_URL.includes('localhost')) {
      console.warn('⚠️ VITE_API_URL contains localhost - this may cause issues in production');
    }
  }
  
  // Production environment validation
  if (mode === 'production' && process.env.VITE_API_URL !== 'https://govrakshak.com/api') {
    console.error('❌ Production build without correct VITE_API_URL!');
    console.error('Expected: https://govrakshak.com/api, Got:', process.env.VITE_API_URL);
  }
  
  return {
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      alias: [
        // Prevent bundling/transformation of massive core-js internals
        { find: /^core-js\/?(.+)?$/, replacement: '/src/shims/empty.js' },
        // Prevent bundling/transformation of fast-png (used by jspdf but causes build hangs)
        { find: /^fast-png\/?(.+)?$/, replacement: '/src/shims/empty.js' }
      ]
    },
    optimizeDeps: {
      // Exclude heavy libraries from pre-bundling (they'll be loaded dynamically)
      exclude: ['core-js', 'jspdf', 'fast-png']
    },
    build: {
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild', // Faster than terser on low-memory systems
      cssCodeSplit: false,
      sourcemap: false,
      cssMinify: true,
      target: 'es2015',
      assetsInlineLimit: 4096,
      emptyOutDir: true,
      rollupOptions: {
        external: [/^core-js\/?/, /^fast-png\/?/],
        output: {
          manualChunks: undefined,
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    }
  };
});
