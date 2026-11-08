const key = (staffId) => `cash.pin.${staffId}`;

async function hash(staffId, pin) {
  const data = new TextEncoder().encode(`cash:${staffId}:${pin}`);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; // запасной вариант для http без secure context
  for (const c of data) h = ((h << 5) + h + c) >>> 0;
  return String(h);
}

export const hasPin = (staffId) => !!localStorage.getItem(key(staffId));
export const savePin = async (staffId, pin) => localStorage.setItem(key(staffId), await hash(staffId, pin));
export const checkPin = async (staffId, pin) => localStorage.getItem(key(staffId)) === (await hash(staffId, pin));
export const clearPin = (staffId) => localStorage.removeItem(key(staffId));
