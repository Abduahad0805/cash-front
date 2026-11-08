import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken, setToken, onAuthFail } from './api';
import { hasPin, savePin, checkPin, clearPin } from './pin';
import Login from './Login.jsx';
import PinPad from './PinPad.jsx';
import Pos from './Pos.jsx';

const IDLE_MS = 5 * 60 * 1000; // автоблокировка через 5 минут бездействия
const MAX_TRIES = 5;

function initialPhase() {
  const staff = localStorage.getItem('cash.staff');
  if (!getToken() || !staff) return 'login';
  return hasPin(staff) ? 'pin' : 'pin-create';
}

export default function App() {
  const [phase, setPhase] = useState(initialPhase);
  const [staffId, setStaffId] = useState(() => localStorage.getItem('cash.staff') || '');
  const [first, setFirst] = useState(null);
  const tries = useRef(0);

  const logout = useCallback(() => {
    setToken(null);
    if (staffId) clearPin(staffId);
    localStorage.removeItem('cash.staff');
    setStaffId('');
    setFirst(null);
    setPhase('login');
  }, [staffId]);

  useEffect(() => { onAuthFail(logout); }, [logout]);

  useEffect(() => {
    if (phase !== 'pos') return;
    let t;
    const reset = () => { clearTimeout(t); t = setTimeout(() => setPhase('pin'), IDLE_MS); };
    const events = ['pointerdown', 'keydown'];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(t); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [phase]);

  if (phase === 'login') {
    return (
      <Login
        onLogin={(id, token) => {
          setToken(token);
          localStorage.setItem('cash.staff', id);
          setStaffId(id);
          setPhase('pin-create');
        }}
      />
    );
  }

  if (phase === 'pin-create') {
    return (
      <PinPad
        key={first ? 'confirm' : 'new'}
        title={first ? 'Повторите PIN-код' : 'Придумайте PIN-код'}
        hint={first ? 'Введите те же 4 цифры ещё раз' : '4 цифры. Он нужен, чтобы быстро разблокировать кассу'}
        onDone={async (pin) => {
          if (!first) { setFirst(pin); return; }
          if (pin !== first) { setFirst(null); return 'PIN-коды не совпали. Начнём заново'; }
          await savePin(staffId, pin);
          setFirst(null);
          setPhase('pos');
        }}
        footer={<button className="link" onClick={logout}>Выйти</button>}
      />
    );
  }

  if (phase === 'pin') {
    return (
      <PinPad
        title="Введите PIN-код"
        hint={`Табельный № ${staffId}`}
        onDone={async (pin) => {
          if (await checkPin(staffId, pin)) { tries.current = 0; setPhase('pos'); return; }
          if (++tries.current >= MAX_TRIES) { tries.current = 0; logout(); return; }
          return `Неверный PIN. Осталось попыток: ${MAX_TRIES - tries.current}`;
        }}
        footer={<button className="link" onClick={logout}>Войти по паролю</button>}
      />
    );
  }

  return <Pos staffId={staffId} onLock={() => setPhase('pin')} onLogout={logout} />;
}
