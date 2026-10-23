import {Check, Clock, MessageCircle, Pencil, Shield, ShieldCheck, Sparkles, Users} from 'lucide-react';
import * as React from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {Plate} from '../art';
import {COMMISSION, DAY, HOUR, PROMO_PRICE, category, district, priceFor, rub} from '../data';
import {busyNow, isPromoted, useStore} from '../store';
import {Ava, BusyCalendar, ItemRow, LineBadge, MiniMap, Note, RouteLine, Sheet, useAct} from '../ui';

const toLocal = (t: number) => new Date(t - new Date(t).getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
/** Ближайший удобный час: не раньше 10:00 и не позже 21:00. */
const roundHour = (t: number) => {
  const d = new Date(t);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  if (d.getHours() < 10) d.setHours(10);
  if (d.getHours() > 21) {
    d.setDate(d.getDate() + 1);
    d.setHours(10);
  }
  return d.getTime();
};

export function ListingPage() {
  const {id} = useParams();
  const s = useStore();
  const nav = useNavigate();
  const act = useAct();
  const l = s.listing(Number(id));
  const [qp] = useSearchParams();
  const start0 = roundHour(s.now + HOUR);
  const fromQ = Number(qp.get('start')), toQ = Number(qp.get('end'));
  const [a, setA] = React.useState(toLocal(fromQ > 0 ? fromQ : start0));
  const [b, setB] = React.useState(toLocal(toQ > fromQ ? toQ : start0 + DAY));
  const [promo, setPromo] = React.useState(false);
  if (!l || (l.status !== 'active' && l.ownerId !== s.me?.id && s.me?.role !== 'moderator')) {
    return <div className="empty"><h3>Объявление снято или не существует</h3><Link className="btn btn-ink" to="/catalog">В каталог</Link></div>;
  }
  const owner = s.user(l.ownerId);
  const mine = s.me?.id === l.ownerId;
  const ta = new Date(a).getTime(), tb = new Date(b).getTime();
  const valid = !!ta && !!tb && tb > ta;
  const pr = valid ? priceFor(l, ta, tb) : null;
  const fee = pr ? Math.round(pr.rent * COMMISSION) : 0;
  const free = valid ? s.isFree(l.id, ta, tb) : true;
  const past = valid && ta < s.now - HOUR;
  const done = s.db.bookings.filter((x) => x.status === 'completed' && s.listing(x.listingId)!.ownerId === owner.id).length;
  const busy = busyNow(s.db, l.id, s.now);
  const similar = s.db.listings.filter((x) => x.status === 'active' && x.category === l.category && x.id !== l.id).slice(0, 4);
  const quick = (h: number, fromNow = true) => {
    const st = fromNow ? start0 : (() => {
      const d = new Date(s.now);
      const add = (6 - d.getDay() + 7) % 7 || 7;
      const sat = new Date(s.now + add * DAY);
      sat.setHours(10, 0, 0, 0);
      return sat.getTime();
    })();
    setA(toLocal(st));
    setB(toLocal(st + h * HOUR));
  };
  const request = () => {
    if (!s.me) return nav('/login', {state: {back: `/listing/${l.id}`}});
    const bid = act(() => s.requestBooking(l.id, ta, tb), 'Запрос отправлен владельцу');
    if (bid) nav(`/deal/${bid}`);
  };
  const chat = () => {
    if (!s.me) return nav('/login', {state: {back: `/listing/${l.id}`}});
    const id = act(() => s.openChat(l.id));
    if (id) nav(`/chats/${id}`);
  };
  const cta = !valid ? 'Укажите даты' : past ? 'Начало уже прошло' : !free ? 'Эти даты заняты' : 'Запросить аренду';

  return (
    <>
      <nav className="crumbs" aria-label="Навигация">
        <Link to="/catalog">Каталог</Link>›<Link to={`/catalog?cat=${l.category}`}>{category(l.category).name}</Link>
      </nav>
      <div className="lst">
        <div>
          <div className="gallery">
            <span className="hero-plate" data-line={l.category}><Plate art={l.art} cat={l.category} size="xl" label={`Иллюстрация: ${l.title}`} /></span>
          </div>
          <div style={{marginTop: 26}}>
            <div className="lst-meta">
              <LineBadge cat={l.category} />
              {isPromoted(l, s.now) ? <span className="tag tag-promo">Продвигается</span> : null}
              {busy ? <span className="tag tag-ink">Сейчас в аренде</span> : <span className="tag tag-go">Можно брать</span>}
              {l.status !== 'active' ? <span className="tag tag-off">{l.status === 'hidden' ? 'Скрыто модератором' : 'В архиве'}</span> : null}
            </div>
            <h1 className="lst-title">{l.title}</h1>
            <div className="lst-meta">
              <RouteLine m={s.distanceTo(l)} cat={l.category} />
              <span>{district(l.districtId).name}</span>
            </div>
            <p className="lst-desc">{l.description}</p>
            {l.kit.length ? (
              <ul className="kit" aria-label="Что входит">
                {l.kit.map((k) => <li key={k}><Check size={18} strokeWidth={3} />{k}</li>)}
              </ul>
            ) : null}
            <div className="facts">
              <div><b><Users size={16} />Передача</b><span>Встречаетесь сами — у дома или у метро</span></div>
              <div><b><Clock size={16} />Срок</b><span>{l.priceHour ? 'От часа' : 'От суток'} до нескольких месяцев</span></div>
              <div><b><Shield size={16} />Залог {rub(l.deposit)}</b><span>Держит сервис и возвращает после возврата вещи</span></div>
              <div><b><MessageCircle size={16} />Контакты</b><span>Телефон и Telegram видны после подтверждения брони</span></div>
            </div>
          </div>
          <div className="section" style={{marginTop: 40, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'}}>
            <BusyCalendar listingId={l.id} sel={valid ? [ta, tb] : null} />
            <MiniMap l={l} />
          </div>
        </div>

        <aside className="book" id="book" aria-label="Бронирование">
          <div className="book-prices">
            <div><b>{l.priceHour ? rub(l.priceHour) : '—'}</b><span>час</span></div>
            <div><b>{l.priceDay ? rub(l.priceDay) : '—'}</b><span>сутки</span></div>
            <div><b>{rub(l.deposit)}</b><span>залог</span></div>
          </div>
          {mine ? (
            <div className="book-body">
              <div className="alert alert-wait"><Sparkles size={18} />Это ваша вещь. Так её видят соседи.</div>
              <Link className="btn btn-ink" to={`/edit/${l.id}`}><Pencil size={17} />Изменить объявление</Link>
              {isPromoted(l, s.now) ? (
                <Note>Продвигается до {new Date(l.promotedUntil!).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'})}: в топ-3 своей категории с отметкой.</Note>
              ) : (
                <button type="button" className="btn btn-line" onClick={() => setPromo(true)}>Продвинуть на 7 дней · {rub(PROMO_PRICE)}</button>
              )}
              <Link className="btn btn-ghost" to="/me/bookings">Брони этой вещи</Link>
            </div>
          ) : (
            <div className="book-body">
              <div className="two">
                <label className="field"><span>Возьму</span><input className="input" type="datetime-local" value={a} onChange={(e) => setA(e.target.value)} /></label>
                <label className="field"><span>Верну</span><input className="input" type="datetime-local" value={b} onChange={(e) => setB(e.target.value)} /></label>
              </div>
              <div className="quick">
                {l.priceHour ? <button type="button" className="chip" onClick={() => quick(3)}>3 часа</button> : null}
                <button type="button" className="chip" onClick={() => quick(24)}>Сутки</button>
                <button type="button" className="chip" onClick={() => quick(34, false)}>Выходные</button>
                <button type="button" className="chip" onClick={() => quick(24 * 7)}>Неделя</button>
                <button type="button" className="chip" onClick={() => quick(24 * 30)}>Месяц</button>
              </div>
              {valid && !free ? <div className="alert alert-bad" role="alert">В эти даты вещь уже забронирована — посмотрите календарь ниже.</div> : null}
              {pr ? (
                <div className="bill" aria-live="polite">
                  <div><span>{pr.units} {pr.unit === 'hour' ? 'ч' : 'сут'} × {rub(pr.unitPrice)}</span><span>{rub(pr.rent)}</span></div>
                  <div><span>Комиссия сервиса 10&nbsp;%</span><span>{rub(fee)}</span></div>
                  <div className="total"><span>К оплате</span><span>{rub(pr.rent + fee)}</span></div>
                  <div className="dep"><span>+ залог, вернётся после возврата</span><span>{rub(l.deposit)}</span></div>
                </div>
              ) : null}
              <button type="button" className="btn btn-go btn-l btn-block" disabled={!valid || !free || past} onClick={request}>{cta}</button>
              <button type="button" className="btn btn-line btn-block" onClick={chat}><MessageCircle size={18} />Написать владельцу</button>
              <Note>Деньги спишутся только после того, как {owner.name.split(' ')[0]} подтвердит бронь.</Note>
            </div>
          )}
          <div className="owner">
            <Ava name={owner.name} />
            <div>
              <Link to={`/user/${owner.id}`}><b>{owner.name}</b></Link>
              <small>{district(owner.districtId).name} · на сервисе с {new Date(owner.createdAt).getFullYear()} · {done} завершённых аренд</small>
            </div>
            <ShieldCheck size={20} style={{marginLeft: 'auto', color: 'var(--go)'}} aria-label="Вход через Telegram подтверждён" />
          </div>
        </aside>
      </div>

      {similar.length ? (
        <section className="section">
          <div className="section-h"><h2>Ещё на этой линии</h2><Link to={`/catalog?cat=${l.category}`}>Все →</Link></div>
          <div className="irows">{similar.map((x) => <ItemRow key={x.id} l={x} />)}</div>
        </section>
      ) : null}

      {!mine && pr ? (
        <div className="mbook">
          <div><b>{rub(pr.rent + fee)}</b><small>+ залог {rub(l.deposit)}</small></div>
          <a className="btn btn-go" href="#book" onClick={(e) => {
            e.preventDefault();
            document.getElementById('book')?.scrollIntoView({behavior: 'smooth'});
          }}>Выбрать даты</a>
        </div>
      ) : null}

      {promo ? (
        <Sheet title="Продвижение на 7 дней" onClose={() => setPromo(false)}>
          <p>Объявление попадёт в первые три места своей категории с отметкой «Продвигается». Через 7 дней вернётся в обычную сортировку.</p>
          <div className="bill"><div className="total"><span>К оплате</span><span>{rub(PROMO_PRICE)}</span></div></div>
          <Note>Демо: оплата в песочнице, деньги не списываются.</Note>
          <button type="button" className="btn btn-go btn-l" onClick={() => {
            act(() => s.promote(l.id), 'Объявление продвигается 7 дней');
            setPromo(false);
          }}>Оплатить {rub(PROMO_PRICE)}</button>
        </Sheet>
      ) : null}
    </>
  );
}
