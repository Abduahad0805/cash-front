import { useEffect, useRef, useState } from 'react';

export default function PinPad({ title, hint, onDone, footer }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (pin.length !== 4 || busy.current) return;
    busy.current = true;
    (async () => {
      const err = await onDone(pin);
      busy.current = false;
      if (err) {
        setError(err);
        setShake(true);
        setTimeout(() => { setShake(false); setPin(''); }, 450);
      }
    })();
  }, [pin]); // eslint-disable-line

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) add(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const add = (d) => { if (!busy.current) { setError(''); setPin((p) => (p.length < 4 ? p + d : p)); } };

  return (
    <main className="auth">
      <div className="auth-card pin">
        <h1>{title}</h1>
        <p className="muted">{hint}</p>
        <div className={`dots ${shake ? 'shake' : ''}`} aria-label={`Введено ${pin.length} из 4`}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? 'on' : ''} />)}
        </div>
        <p className="form-error" role="alert">{error}&nbsp;</p>
        <div className="keys">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => add(String(n))}>{n}</button>)}
          <span />
          <button onClick={() => add('0')}>0</button>
          <button className="del" aria-label="Стереть" onClick={() => setPin((p) => p.slice(0, -1))}>⌫</button>
        </div>
        {footer}
      </div>
    </main>
  );
}
