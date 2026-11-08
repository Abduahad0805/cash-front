import { useState } from 'react';
import { api } from './api';

export default function Login({ onLogin }) {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = /^\d{9}$/.test(staffId) && password.length > 0;

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.login(staffId, password);
      const token = r?.accessToken || r?.accesToken || r?.token;
      if (!token) throw new Error('Сервер не вернул токен');
      onLogin(staffId, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="logo">К</div>
        <h1>Вход в кассу</h1>
        <label>
          Табельный номер
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="username"
            maxLength={9}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value.replace(/\D/g, ''))}
            placeholder="9 цифр"
          />
          <small className={staffId && staffId.length < 9 ? 'warn' : ''}>{staffId.length} из 9</small>
        </label>
        <label>
          Пароль
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn primary big" disabled={!valid || busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
    </main>
  );
}
