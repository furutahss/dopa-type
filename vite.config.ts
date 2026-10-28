import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// XServer: https://games.furutahss.com/dopa-type/
// アセットもルータもこのサブディレクトリ基準。変えるときは .htaccess の RewriteBase も揃える。
export default defineConfig({
  base: '/dopa-type/',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
