import {ArrowRight, Search} from 'lucide-react';
import * as React from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Picto, Plate} from '../art';
import {CATEGORIES, DISTRICTS, category, dayShort, district, plural, rub} from '../data';
import {useStore} from '../store';
import {Ava, RouteLine} from '../ui';

const WHEN = [
  {id: 'today', label: 'Сегодня'},
  {id: 'weekend', label: 'На выходные'},
  {id: 'week', label: 'На неделю'},
  {id: 'any', label: 'Любые даты'},
];

export function Home() {
  const s = useStore();
  const nav = useNavigate();
  const [tab, setTab] = React.useState<'take' | 'give'>('take');
  const [q, setQ] = React.useState('');
  const [when, setWhen] = React.useState('weekend');
  const [d, setD] = React.useState(s.me?.districtId ?? 1);
  const active = s.db.listings.filter((l) => l.status === 'active');
  const near = [...active].sort((a, b) => s.distanceTo(a) - s.distanceTo(b)).slice(0, 8);
  const open = s.db.requests.filter((r) => !r.closedAt && r.endsAt > s.now).slice(-3).reverse();
  const nearCount = active.filter((l) => s.distanceTo(l) <= 3000).length;

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (when !== 'any') p.set('when', when);
    p.set('from', String(d));
    nav(`/catalog?${p}`);
  };

  return (
    <>
      <section className="hero">
        <div className="hero-in">
          <div>
            <h1>Не покупайте на&nbsp;один раз. <em>Возьмите у&nbsp;соседа</em></h1>
            <p className="hero-lead">Дрель на вечер, палатка на выходные, коляска на месяц — у людей рядом с вами. Оплата и залог проходят через сервис.</p>
            <div className="finder">
              <div className="finder-tabs" role="tablist" aria-label="Что хотите сделать">
                <button type="button" role="tab" aria-selected={tab === 'take'} onClick={() => setTab('take')}>Хочу взять</button>
                <button type="button" role="tab" aria-selected={tab === 'give'} onClick={() => setTab('give')}>Хочу сдать</button>
              </div>
              {tab === 'take' ? (
                <form className="finder-body" onSubmit={go}>
                  <div className="finder-row">
                    <label className="field">
                      <span>Что нужно</span>
                      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Например, перфоратор" />
                    </label>
                    <label className="field">
                      <span>Откуда считать расстояние</span>
                      <select className="select" value={d} onChange={(e) => setD(+e.target.value)}>
                        {DISTRICTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="field">
                    <span>Когда</span>
                    <div className="finder-when chips">
                      {WHEN.map((w) => <button key={w.id} type="button" className="chip" aria-pressed={when === w.id} onClick={() => setWhen(w.id)}>{w.label}</button>)}
                    </div>
                  </div>
                  <button className="btn btn-go btn-l" type="submit"><Search size={19} />Показать вещи рядом</button>
                </form>
              ) : (
                <div className="finder-body">
                  <p style={{color: 'var(--ink-2)'}}>Разместите вещь бесплатно: фото, цена за час или сутки и залог. Комиссию 10&nbsp;% платит арендатор.</p>
                  <div className="chips">
                    {CATEGORIES.map((c) => (
                      <Link key={c.slug} to={`/new?cat=${c.slug}`} className="chip" data-line={c.slug}><i />{c.short}</Link>
                    ))}
                  </div>
                  <Link className="btn btn-go btn-l" to="/new">Разместить вещь — около 3 минут<ArrowRight size={19} /></Link>
                </div>
              )}
            </div>
            <div className="hero-facts">
              <div><b className="num">{nearCount} {plural(nearCount, 'вещь', 'вещи', 'вещей')}</b><span>в 3 км от вас</span></div>
              <div><b>0 ₽</b><span>за размещение</span></div>
              <div><b>Залог</b><span>держит сервис</span></div>
            </div>
          </div>

          <div className="board" aria-label="Ближайшие вещи">
            <div className="board-h">
              <b>Рядом сейчас</b>
              <span className="here"><i />вы: {s.here().name}</span>
            </div>
            {near.map((l) => (
              <Link key={l.id} to={`/listing/${l.id}`} className="board-row" data-line={l.category}>
                <Plate art={l.art} cat={l.category} size="m" />
                <span style={{minWidth: 0}}>
                  <span className="t" style={{display: 'block'}}>{l.title}</span>
                  <span className="s">
                    <RouteLine m={s.distanceTo(l)} cat={l.category} dark />
                  </span>
                </span>
                <span className="p"><b>{rub(l.priceDay ?? l.priceHour!)}</b><small>{l.priceDay ? 'сутки' : 'час'}</small></span>
              </Link>
            ))}
            <div className="board-f">
              <span>Ближе — выше. Пунктир — дальше 2 км.</span>
              <Link to="/catalog">Весь каталог →</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="main" style={{paddingBottom: 0}}>
        <section className="section" style={{marginTop: 48}}>
          <div className="section-h"><h2>Линии каталога</h2><Link to="/catalog">Все вещи →</Link></div>
          <div className="lines">
            {CATEGORIES.map((c) => {
              const n = active.filter((l) => l.category === c.slug).length;
              return (
                <Link key={c.slug} to={`/catalog?cat=${c.slug}`} className="lineitem" data-line={c.slug}>
                  <span className="plate"><Picto name={c.slug} size={34} /></span>
                  <span style={{display: 'grid', gap: 2}}>
                    <b>{c.name}</b>
                    <small className="num">{n} {plural(n, 'вещь', 'вещи', 'вещей')}</small>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="section">
          <div className="wanted">
            <div className="wanted-l">
              <h2>Не нашли — напишите «ищу»</h2>
              <p>Опишите вещь и даты. Соседи, у которых она есть, сами пришлют предложение в чат.</p>
              <div className="btns">
                <Link className="btn btn-ink" to="/request/new">Оставить запрос</Link>
                <Link className="btn btn-line" to="/requests" style={{background: 'transparent'}}>Что ищут сейчас</Link>
              </div>
            </div>
            <div className="wanted-list">
              {open.map((r) => {
                const u = s.user(r.authorId);
                return (
                  <div key={r.id} className="req" data-line={r.category}>
                    <Ava name={u.name} small />
                    <div style={{minWidth: 0}}>
                      <div className="who">{u.name.split(' ')[0]} ищет · {district(r.districtId).name}</div>
                      <b>{r.description}</b>
                      <div className="meta"><span className="linebadge" data-line={r.category}><i />{category(r.category).short}</span><span className="num">{dayShort(r.startsAt)} — {dayShort(r.endsAt)}</span></div>
                    </div>
                    <div className="budget">{r.maxPrice ? `до ${rub(r.maxPrice)}` : 'цена договорная'}<small>за весь срок</small></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-h"><h2>Как проходит аренда</h2></div>
          <div className="howline">
            <div className="howstop"><b>Найдите рядом</b><p>Выберите даты — занятые вещи сразу пропадут из выдачи. Видно, сколько идти пешком.</p></div>
            <div className="howstop"><b>Договоритесь в чате</b><p>Телефоны и ники скрыты до подтверждения брони — никто не позвонит раньше времени.</p></div>
            <div className="howstop"><b>Оплатите с залогом</b><p>Аренда, комиссия 10&nbsp;% и залог — отдельными строками ещё до оплаты.</p></div>
            <div className="howstop"><b>Верните вещь</b><p>Владелец подтверждает возврат с фото, залог сразу возвращается вам.</p></div>
          </div>
        </section>

        <section className="owner-cta">
          <div>
            <h2>У вас наверняка есть то, что сейчас нужно соседу</h2>
            <p>Палатка за 15&nbsp;000&nbsp;₽ окупается за первый сезон. Размещение бесплатное, вещь защищает залог, а сделку видно в кабинете от брони до возврата.</p>
            <Link className="btn btn-go btn-l" to="/new" style={{marginTop: 24}}>Сдать вещь</Link>
          </div>
          <div className="calc" aria-label="Пример дохода владельца">
            <div><span>Палатка, 400 ₽ в сутки</span><span>×3 дня</span></div>
            <div><span>Аренд за сезон</span><span>10</span></div>
            <div><span>Комиссия сервиса</span><span>платит арендатор</span></div>
            <div className="sum"><span>Ваш доход</span><span>12 000 ₽</span></div>
          </div>
        </section>
      </div>
    </>
  );
}
