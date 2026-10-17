import * as React from 'react';
import {Link} from 'react-router-dom';
import {Plate} from '../art';
import {DAY, category, dayShort, district, rub} from '../data';
import {useStore} from '../store';
import {Ava, Empty, useAct} from '../ui';

export function Admin() {
  const s = useStore();
  const act = useAct();
  const [tab, setTab] = React.useState<'listings' | 'users'>('listings');
  const [q, setQ] = React.useState('');
  if (s.me?.role !== 'moderator') {
    return <Empty title="Раздел для модераторов" action={<Link className="btn btn-ink" to="/login">Войти как модератор</Link>}>Войдите под учётной записью модератора (в демо — Дарья Андреева).</Empty>;
  }
  const ql = q.toLowerCase();
  const listings = s.db.listings.filter((l) => !ql || l.title.toLowerCase().includes(ql) || s.user(l.ownerId).name.toLowerCase().includes(ql));
  const users = s.db.users.filter((u) => u.role === 'user' && (!ql || u.name.toLowerCase().includes(ql) || u.username.includes(ql)));
  return (
    <>
      <div className="pagehead"><div><h1>Модерация</h1><p>Скрытое объявление пропадает из каталога и поиска. Заблокированный пользователь не может войти и совершать сделки.</p></div></div>
      <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center'}}>
        <div className="chips" role="tablist">
          <button type="button" role="tab" className="chip" aria-pressed={tab === 'listings'} aria-selected={tab === 'listings'} onClick={() => setTab('listings')}>Объявления · {s.db.listings.length}</button>
          <button type="button" role="tab" className="chip" aria-pressed={tab === 'users'} aria-selected={tab === 'users'} onClick={() => setTab('users')}>Пользователи · {s.db.users.length - 1}</button>
        </div>
        <input className="input" style={{maxWidth: 320}} placeholder="Найти по названию или имени" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск" />
      </div>
      {tab === 'listings' ? (
        <div className="rows">
          {listings.map((l) => (
            <div key={l.id} className="row" data-line={l.category}>
              <Plate art={l.art} cat={l.category} size="m" />
              <div style={{minWidth: 0}}>
                <Link to={`/listing/${l.id}`} className="t">{l.title}</Link>
                <div className="m"><span>{category(l.category).short}</span><span>{s.user(l.ownerId).name}</span><span>{rub(l.priceDay ?? l.priceHour!)}</span><span>с {dayShort(l.createdAt)}</span></div>
              </div>
              <div className="r">
                {l.status === 'hidden' ? <span className="tag tag-off">Скрыто</span> : l.status === 'archived' ? <span className="tag tag-off">Снято владельцем</span> : <span className="tag tag-go">В каталоге</span>}
                {l.status === 'hidden'
                  ? <button type="button" className="btn btn-line btn-s" onClick={() => act(() => s.setListingStatus(l.id, 'active'), 'Объявление снова в каталоге')}>Вернуть</button>
                  : l.status === 'active' ? <button type="button" className="btn btn-danger btn-s" onClick={() => act(() => s.setListingStatus(l.id, 'hidden'), 'Объявление скрыто')}>Скрыть</button> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rows">
          {users.map((u) => (
            <div key={u.id} className="row">
              <Ava name={u.name} />
              <div><Link to={`/user/${u.id}`} className="t">{u.name}</Link><div className="m"><span>@{u.username}</span><span>{district(u.districtId).name}</span><span>{s.db.listings.filter((l) => l.ownerId === u.id).length} объявл.</span></div></div>
              <div className="r">
                {u.isBlocked ? <span className="tag tag-off">Заблокирован</span> : null}
                <button type="button" className={'btn btn-s ' + (u.isBlocked ? 'btn-line' : 'btn-danger')} onClick={() => act(() => s.block(u.id, !u.isBlocked), u.isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован')}>
                  {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function Analytics() {
  const s = useStore();
  const d = s.db;
  const month = new Date(s.now);
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const m0 = month.getTime();
  const m1 = d.bookings.filter((b) => b.status === 'completed' && (b.completedAt ?? 0) >= m0).length;
  const reached = (b: (typeof d.bookings)[number]) => ['confirmed', 'paid', 'handed_over', 'completed'].includes(b.status);
  const conf = d.bookings.filter((b) => reached(b) && b.startsAt >= m0 && b.startsAt < s.now + 30 * DAY);
  const m3 = conf.length ? Math.round((conf.filter((b) => b.status === 'completed').length / conf.length) * 100) : 0;
  const recent = d.listings.filter((l) => l.createdAt <= s.now - 14 * DAY);
  const m2 = recent.length ? Math.round((recent.filter((l) => d.chats.some((c) => c.listingId === l.id)).length / recent.length) * 100) : 0;
  const m4 = d.listings.filter((l) => l.createdAt >= s.now - 7 * DAY).length;
  const funnel: [string, number][] = [
    ['Объявлений', d.listings.length],
    ['Чатов начато', d.chats.length],
    ['Запросов брони', d.bookings.length],
    ['Подтверждено', d.bookings.filter(reached).length],
    ['Оплачено', d.bookings.filter((b) => ['paid', 'handed_over', 'completed'].includes(b.status)).length],
    ['Завершено', d.bookings.filter((b) => b.status === 'completed').length],
  ];
  const top = Math.max(...funnel.map((f) => f[1]), 1);
  const metric = (name: string, v: string, goal: string, pct: number) => (
    <div className="metric"><span className="muted">{name}</span><b>{v}</b><div className="bar"><i style={{width: `${Math.min(100, pct)}%`}} /></div><span className="goal">{goal}</span></div>
  );
  return (
    <>
      <div className="pagehead"><div><h1>Метрики</h1><p>Считаются прямо по данным сервиса — объявлениям, чатам и броням. Цели — из PRD v1.3.</p></div></div>
      <div className="metrics">
        {metric('M-1 · завершённые аренды за месяц', String(m1), 'цель — 100 в месяц', m1)}
        {metric('M-2 · отклик на объявления', `${m2} %`, 'объявления с чатом; цель ≥ 40 %', (m2 / 40) * 100)}
        {metric('M-3 · доведение брони', `${m3} %`, 'завершены / подтверждены; цель ≥ 70 %', (m3 / 70) * 100)}
        {metric('M-4 · новые объявления за неделю', String(m4), 'цель ≥ 50 в неделю', (m4 / 50) * 100)}
      </div>
      <section className="section" style={{marginTop: 40}}>
        <div className="section-h"><h2 style={{fontSize: 24}}>Сколько всего на каждом шаге</h2></div>
        <div className="funnel">
          {funnel.map(([k, v]) => <div key={k} className="fbar"><span>{k}</span><div><i style={{width: `${(v / top) * 100}%`}} /></div><b>{v}</b></div>)}
        </div>
      </section>
    </>
  );
}
