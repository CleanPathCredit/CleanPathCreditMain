import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // SECURITY: Do NOT inject secret API keys (GEMINI_API_KEY, etc.) via
  // `define`. Anything defined here is bundled into the client JS and
  // readable by any visitor. Call Gemini / other paid APIs from a backend
  // endpoint and forward the request from the browser.
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      // Split heavy vendor libs out of the single entry chunk so they cache
      // independently and parallelize — improves LCP on the public pages.
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-clerk': ['@clerk/clerk-react'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-analytics': ['posthog-js'],
          },
        },
      },
    },
  };
});
