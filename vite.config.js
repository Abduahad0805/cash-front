import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: хосты и порты сервисов (меняйте здесь или в .env через PROXY_*)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const auth = env.PROXY_AUTH || 'http://localhost:8083';
  const catalog = env.PROXY_CATALOG || 'http://localhost:8082';
  const orders = env.PROXY_ORDERS || 'http://localhost:8083';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api/v1/worker': auth,     // авторизация
        '/api/v1/tables': catalog,  // каталог
        '/api/v1/orders': orders,   // заказы
      },
    },
  };
});
