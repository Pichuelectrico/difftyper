import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base relativa para funcionar en GitHub Pages (…github.io/difftyper/) y en local
export default defineConfig({ plugins: [react()], base: './', server: { port: 5173 } });
