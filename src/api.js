const pick = (url) => (import.meta.env.DEV ? '' : url || '');
const AUTH = pick(import.meta.env.VITE_AUTH_URL);
const CATALOG = pick(import.meta.env.VITE_CATALOG_URL);
const ORDERS = pick(import.meta.env.VITE_ORDERS_URL);
let token = localStorage.getItem('cash.token');
let onUnauthorized = () => {};

export const getToken = () => token;
export const setToken = (t) => {
  token = t;
  t ? localStorage.setItem('cash.token', t) : localStorage.removeItem('cash.token');
};
export const onAuthFail = (fn) => { onUnauthorized = fn; };

async function request(base, path, { method = 'GET', body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && token) { onUnauthorized(); throw new Error('Сессия истекла. Войдите заново'); }
  if (!res.ok) {
    let msg;
    try { const j = await res.json(); msg = j.message || j.error; } catch { /* no body */ }
    throw new Error(msg || (res.status === 401 ? 'Неверный номер или пароль' : `Ошибка сервера (${res.status})`));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  login: (staffId, password) => request(AUTH, '/api/v1/worker/auth/logIn', { method: 'POST', body: { staffId: Number(staffId), password } }),
  tables: () => request(CATALOG, '/api/v1/tables'),
  allOrders: () => request(ORDERS, '/api/v1/orders/cash'),
  tableOrders: (tableId) => request(ORDERS, `/api/v1/orders/cash/table/${tableId}`),
  order: (orderId) => request(ORDERS, `/api/v1/orders/cash/${orderId}`),
  pay: (orderId) => request(ORDERS, `/api/v1/orders/cash/${orderId}/status`, { method: 'PATCH' }),
};
