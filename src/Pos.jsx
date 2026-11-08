import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

const money = (n) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(n) || 0) + ' сом.';
const qty = (q) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(Number(q) || 0);

// Подпишите свои значения OrderStatus здесь. Неизвестные показываются как есть.
const STATUS = {
  NEW: ['Новый', 'amber'], CREATED: ['Новый', 'amber'], PENDING: ['Ожидает', 'amber'],
  PREPARING: ['Готовится', 'amber'], IN_PROGRESS: ['Готовится', 'amber'],
  READY: ['Готов', 'green'], SERVED: ['Подан', 'green'],
  PAID: ['Оплачен', 'grey'], COMPLETED: ['Завершён', 'grey'], CANCELLED: ['Отменён', 'red'],
};
const CLOSED = ['PAID', 'COMPLETED', 'CANCELLED'];
const statusOf = (s) => STATUS[String(s).toUpperCase()] || [String(s ?? '—'), 'grey'];

function useAsync(fn, deps) {
  const [st, setSt] = useState({ data: null, loading: true, error: null });
  const load = useCallback(() => {
    let alive = true;
    setSt((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: e.message }));
    return () => { alive = false; };
  }, deps); // eslint-disable-line
  useEffect(() => load(), [load]);
  return [st, load];
}

function Async({ st, reload, empty, children }) {
  if (st.loading && !st.data) return <div className="note"><span className="spin" />Загрузка…</div>;
  if (st.error) return <div className="note err">{st.error}<button className="btn ghost" onClick={reload}>Повторить</button></div>;
  if (!st.data || (Array.isArray(st.data) && !st.data.length)) return <div className="note">{empty}</div>;
  return children(st.data);
}

function Chip({ status }) {
  const [label, tone] = statusOf(status);
  return <span className={`chip ${tone}`}>{label}</span>;
}

function Receipt({ orderId, st, reload, onPay, onClose }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setConfirm(false); setErr(''); }, [orderId]);

  if (!orderId) return <aside className="right idle"><p>Выберите заказ,<br />чтобы увидеть чек</p></aside>;

  const o = st.data;
  const closed = o && CLOSED.includes(String(o.status).toUpperCase());

  async function pay() {
    setBusy(true); setErr('');
    try { await onPay(); setConfirm(false); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <aside className="right open">
      <button className="close" onClick={onClose} aria-label="Закрыть">✕</button>
      <div className="receipt">
        <Async st={st} reload={reload} empty="Заказ не найден">
          {(o) => (
            <>
              <header>
                <h2>Заказ № {o.orderNumber}</h2>
                <p>{(o.tableNumbers || []).length ? `Стол ${o.tableNumbers.join(', ')}` : 'Без стола'} · Официант {o.staffId}</p>
                <Chip status={o.status} />
              </header>
              <ul className="lines">
                {(o.menus || []).map((m, i) => (
                  <li key={i}>
                    <span className="n">{m.name}</span>
                    <span className="qty">× {qty(m.quantity)}</span>
                    <b>{money(Number(m.quantity) * Number(m.price))}</b>
                  </li>
                ))}
              </ul>
              {o.comment && <p className="comment">Комментарий: {o.comment}</p>}
              <div className="total"><span>Итого</span><b>{money(o.totalPrice)}</b></div>
            </>
          )}
        </Async>
      </div>
      <div className="edge" />
      <footer>
        {err && <p className="form-error">{err}</p>}
        {!confirm ? (
          <button className="btn primary big" disabled={!o || closed} onClick={() => setConfirm(true)}>
            {closed ? 'Заказ закрыт' : o ? `Оплатить ${money(o.totalPrice)}` : 'Оплатить'}
          </button>
        ) : (
          <div className="row">
            <button className="btn ghost big" disabled={busy} onClick={() => setConfirm(false)}>Отмена</button>
            <button className="btn primary big" disabled={busy} onClick={pay}>{busy ? 'Проводим…' : 'Принять оплату'}</button>
          </div>
        )}
      </footer>
    </aside>
  );
}

export default function Pos({ staffId, onLock, onLogout }) {
  const [mode, setMode] = useState('tables'); // tables | all
  const [table, setTable] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [toast, setToast] = useState('');

  const [tables, reloadTables] = useAsync(api.tables, []);
  const [list, reloadList] = useAsync(
    () => (mode === 'all' ? api.allOrders() : table ? api.tableOrders(table.id) : Promise.resolve(null)),
    [mode, table],
  );
  const [detail, reloadDetail] = useAsync(() => (orderId ? api.order(orderId) : Promise.resolve(null)), [orderId]);

  const go = (m) => { setMode(m); setTable(null); setOrderId(null); };
  const showOrders = mode === 'all' || table;

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }, [toast]);

  async function pay() {
    await api.pay(orderId);
    setToast(`Заказ № ${detail.data?.orderNumber ?? ''} оплачен`);
    setOrderId(null); // оплаченный заказ уходит из выдачи кассы, чек закрываем
    reloadList();
  }

  return (
    <div className={`pos ${orderId ? 'has-order' : ''}`}>
      <nav className="left">
        <div className="me">
          <span className="avatar">{String(staffId).slice(-2)}</span>
          <div><b>Кассир</b><small>№ {staffId}</small></div>
        </div>
        <button className={`nav ${mode === 'tables' ? 'active' : ''}`} onClick={() => go('tables')}>Столики</button>
        <button className={`nav ${mode === 'all' ? 'active' : ''}`} onClick={() => go('all')}>Все заказы</button>
        <div className="grow" />
        <button className="nav" onClick={onLock}>Заблокировать</button>
        <button className="nav danger" onClick={onLogout}>Выйти</button>
      </nav>

      <section className="center">
        {!showOrders ? (
          <>
            <h1>Столики</h1>
            <Async st={tables} reload={reloadTables} empty="Столиков пока нет">
              {(rows) => (
                <div className="tables">
                  {rows.map((t) => (
                    <button key={t.id} className="table" onClick={() => { setTable(t); setOrderId(null); }}>{t.number}</button>
                  ))}
                </div>
              )}
            </Async>
          </>
        ) : (
          <>
            <div className="head">
              {table && <button className="btn ghost" onClick={() => go('tables')}>← Столики</button>}
              <h1>{table ? `Заказы стола ${table.number}` : 'Все заказы'}</h1>
              <button className="btn ghost" onClick={reloadList}>Обновить</button>
            </div>
            <Async st={list} reload={reloadList} empty={table ? 'У этого стола нет заказов' : 'Заказов пока нет'}>
              {(rows) => (
                <div className="orders">
                  {rows.map((o) => (
                    <button key={o.orderId} className={`order ${o.orderId === orderId ? 'active' : ''}`} onClick={() => setOrderId(o.orderId)}>
                      <b>№ {o.orderNumber}</b>
                      <span>{(o.tableNumbers || []).length ? `Стол ${o.tableNumbers.join(', ')}` : 'Без стола'}</span>
                      <Chip status={o.status} />
                    </button>
                  ))}
                </div>
              )}
            </Async>
          </>
        )}
      </section>

      <Receipt orderId={orderId} st={detail} reload={reloadDetail} onPay={pay} onClose={() => setOrderId(null)} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
