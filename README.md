# Касса (frontend)

React + Vite. Запуск:

    npm install
    npm run dev          # адреса сервисов: vite.config.js или .env (PROXY_AUTH / PROXY_CATALOG / PROXY_ORDERS)
    npm run build        # production; адреса в .env.production (см. .env.example)

Поток: вход (staffId 9 цифр + пароль) → создание PIN (4 цифры) → касса.
PIN хранится в localStorage только в виде хеша; блокировка через 5 минут бездействия; 5 неверных PIN — выход.
