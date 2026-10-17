import {AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Info} from 'lucide-react';
import * as React from 'react';
import {Link} from 'react-router-dom';
import {Plate} from './art';
import {
  BLOCKING, type Booking, type BookingStatus, DAY, type Listing, STATUS, category, distanceText, district, meters, priceLine, rub,
} from './data';
import {ActionError, busyNow, isPromoted, useStore} from './store';

// ── уведомления и обработка ошибок действий ──
type Toast = {text: string; bad?: boolean; id: number};
const ToastCtx = React.createContext<(t: string, bad?: boolean) => void>(() => undefined);
export const useToast = () => React.useContext(ToastCtx);
export function ToastHost({children}: {children: React.ReactNode}) {
  const [t, setT] = React.useState<Toast | null>(null);
  const show = React.useCallback((text: string, bad?: boolean) => setT({text, bad, id: Date.now()}), []);
  React.useEffect(() => {
    if (!t) return;
    const h = setTimeout(() => setT(null), 3800);
    return () => clearTimeout(h);
  }, [t]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t ? (
        <div key={t.id} className={'toast' + (t.bad ? ' bad' : '')} role={t.bad ? 'alert' : 'status'}>
          {t.bad ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {t.text}
        </div>
      ) : null}
    </ToastCtx.Provider>
  );
}
/** Выполнить действие: ошибку показать человеческим текстом, успех — коротким подтверждением. */
export function useAct() {
  const toast = useToast();
  return React.useCallback(<T,>(fn: () => T, ok?: string): T | undefined => {
    try {
      const r = fn();
      if (ok) toast(ok);
      return r;
    } catch (e) {
      toast(e instanceof ActionError ? e.message : 'Что-то пошло не так. Попробуйте ещё раз.', true);
      return undefined;
    }
  }, [toast]);
}

// ── «линия пути»: вы здесь → вещь ──
export function RouteLine({m, cat, dark}: {m: number; cat: Listing['category'] | 'request'; dark?: boolean}) {
  const k = Math.min(1, m / 5000);
  const len = 40 + Math.round(k * 64);
  return (
    <span className="route" data-line={cat}>
      <svg width={len + 16} height="14" viewBox={`0 0 ${len + 16} 14`} aria-hidden="true">
        <line x1="7" y1="7" x2={len + 7} y2="7" stroke={dark ? '#3a4c68' : '#cfd5de'} strokeWidth="4" strokeLinecap="round" />
        <line x1="7" y1="7" x2={len + 7} y2="7" stroke="var(--line)" strokeWidth="4" strokeLinecap="round" strokeDasharray={m > 2000 ? '2 5' : undefined} />
        <circle cx="7" cy="7" r="5.5" fill="#ffcc00" stroke={dark ? '#0f1b2d' : '#0f1b2d'} strokeWidth="2" />
        <circle cx={len + 8} cy="7" r="5" fill="#fff" stroke="var(--line)" strokeWidth="3" />
      </svg>
      <span>{distanceText(m)}</span>
    </span>
  );
}

export function LineBadge({cat}: {cat: Listing['category']}) {
  return (
    <span className="linebadge" data-line={cat}>
      <i />
      {category(cat).name}
    </span>
  );
}

/** Подпись статуса с точки зрения того, кто смотрит. */
export function statusFor(s: BookingStatus, side?: 'renter' | 'owner') {
  if (side === 'owner' && s === 'requested') return 'Ждёт вашего ответа';
  if (side === 'owner' && s === 'paid') return 'Передайте вещь';
  if (side === 'owner' && s === 'confirmed') return 'Ждёт оплаты арендатора';
  if (side === 'owner' && s === 'handed_over') return 'Вещь у арендатора';
  if (side === 'renter' && s === 'confirmed') return 'Подтверждена — оплатите';
  if (side === 'renter' && s === 'handed_over') return 'Вещь у вас';
  return STATUS[s].label;
}
export function StatusTag({s, side}: {s: BookingStatus; side?: 'renter' | 'owner'}) {
  const v = STATUS[s];
  const mine = (side === 'owner' && (s === 'requested' || s === 'paid' || s === 'handed_over')) || (side === 'renter' && s === 'confirmed');
  return <span className={`tag tag-${mine ? 'here' : v.tone}`}>{statusFor(s, side)}</span>;
}
/** Что нужно сделать по сделке именно мне — текст кнопки или null. */
export function nextAction(b: Booking, side: 'renter' | 'owner') {
  if (side === 'owner' && b.status === 'requested') return 'Ответить на запрос';
  if (side === 'owner' && b.status === 'paid') return 'Отметить передачу';
  if (side === 'owner' && b.status === 'handed_over') return 'Подтвердить возврат';
  if (side === 'renter' && b.status === 'confirmed') return `Оплатить ${rub(b.rentAmount + b.commissionAmount + b.depositAmount)}`;
  return null;
}

export function Ava({name, small}: {name: string; small?: boolean}) {
  const ini = name.split(' ').map((x) => x[0]).slice(0, 2).join('');
  return <span className={'ava' + (small ? ' ava-s' : '')} aria-hidden="true">{ini}</span>;
}

// ── строка-«расписание» вещи: основной вид каталога ──
export function ItemRow({l, q, m}: {l: Listing; q?: string; m?: number}) {
  const s = useStore();
  const busy = busyNow(s.db, l.id, s.now);
  const dist = m ?? s.distanceTo(l);
  return (
    <Link to={`/listing/${l.id}${q ?? ''}`} className="irow" data-line={l.category}>
      <Plate art={l.art} cat={l.category} size="m" />
      <span className="irow-main">
        <span className="irow-t">{l.title}</span>
        <span className="irow-m">
          <RouteLine m={dist} cat={l.category} />
          <span>{district(l.districtId).name}</span>
          {isPromoted(l, s.now) ? <span className="tag tag-promo">Продвигается</span> : null}
          {busy ? <span className="tag tag-ink">Занята до {new Date(busy.endsAt).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})}</span> : null}
        </span>
      </span>
      <span className="irow-p">
        <b>{rub(l.priceDay ?? l.priceHour!)}<small> / {l.priceDay ? 'сутки' : 'час'}</small></b>
        <span>{l.priceHour && l.priceDay ? `${rub(l.priceHour)} / час · ` : ''}залог {rub(l.deposit)}</span>
      </span>
    </Link>
  );
}

// ── карточка вещи в сетке ──
export function ItemCard({l, q}: {l: Listing; q?: string}) {
  const s = useStore();
  const busy = busyNow(s.db, l.id, s.now);
  const m = s.distanceTo(l);
  return (
    <Link to={`/listing/${l.id}${q ?? ''}`} className="item">
      <Plate art={l.art} cat={l.category} size="xl" />
      <span className="item-flags">
        {isPromoted(l, s.now) ? <span className="tag tag-promo">Продвигается</span> : null}
        {busy ? <span className="tag tag-ink">Занята до {new Date(busy.endsAt).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})}</span> : null}
      </span>
      <span className="item-price">
        <b>{rub(l.priceDay ?? l.priceHour!)}</b>
        <span>{l.priceDay ? 'сутки' : 'час'}{l.priceHour && l.priceDay ? ` · ${rub(l.priceHour)} час` : ''}</span>
      </span>
      <span className="item-t">{l.title}</span>
      <RouteLine m={m} cat={l.category} />
      <span className="item-m">
        <span>{district(l.districtId).name}</span>
        <span>залог {rub(l.deposit)}</span>
      </span>
    </Link>
  );
}

export function Empty({title, children, action}: {title: string; children?: React.ReactNode; action?: React.ReactNode}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Note({children}: {children: React.ReactNode}) {
  return (
    <p className="note">
      <Info size={16} />
      <span>{children}</span>
    </p>
  );
}

export function Sheet({title, onClose, children}: {title: string; onClose: () => void; children: React.ReactNode}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, input, select, textarea, a')?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => {
      window.removeEventListener('keydown', k);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ── календарь занятости ──
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export function BusyCalendar({listingId, sel}: {listingId: number; sel?: [number, number] | null}) {
  const s = useStore();
  const [shift, setShift] = React.useState(0);
  const base = new Date(s.now);
  const month = new Date(base.getFullYear(), base.getMonth() + shift, 1);
  const first = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const busy = s.db.bookings.filter((b) => b.listingId === listingId && BLOCKING.includes(b.status));
  const today = new Date(s.now);
  today.setHours(0, 0, 0, 0);
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < first; i++) cells.push(<span key={'e' + i} />);
  for (let d = 1; d <= days; d++) {
    const a = new Date(month.getFullYear(), month.getMonth(), d).getTime(), b = a + DAY;
    const isBusy = busy.some((x) => x.startsAt < b && a < x.endsAt);
    const isSel = sel && sel[0] < b && a < sel[1];
    const cls = ['cal-d', a < today.getTime() ? 'past' : '', isBusy ? 'busy' : '', a === today.getTime() ? 'today' : '', isSel ? 'sel' : ''].join(' ');
    cells.push(<span key={d} className={cls} title={isBusy ? 'Занято подтверждённой бронью' : undefined}>{d}</span>);
  }
  return (
    <div className="cal">
      <div className="cal-h">
        <b>{month.toLocaleDateString('ru-RU', {month: 'long', year: 'numeric'})}</b>
        <button type="button" className="btn btn-ghost btn-s" onClick={() => setShift((x) => x - 1)} disabled={shift <= 0} aria-label="Предыдущий месяц"><ChevronLeft size={18} /></button>
        <button type="button" className="btn btn-ghost btn-s" onClick={() => setShift((x) => x + 1)} disabled={shift >= 5} aria-label="Следующий месяц"><ChevronRight size={18} /></button>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <span key={d} className="dow">{d}</span>)}
        {cells}
      </div>
      <div className="cal-legend">
        <span><i style={{background: 'repeating-linear-gradient(-45deg,#eef1f5 0 3px,#e1e6ec 3px 6px)'}} />занято</span>
        <span><i style={{background: 'var(--here)'}} />ваш период</span>
        <span><i style={{boxShadow: 'inset 0 0 0 2px var(--ink)'}} />сегодня</span>
      </div>
    </div>
  );
}

// ── мини-схема района: вы здесь и вещь ──
export function MiniMap({l}: {l: Listing}) {
  const s = useStore();
  const here = s.here();
  const m = s.distanceTo(l);
  // проекция в 320×180: вы — слева, вещь — по направлению
  const dx = (l.lng - here.lng) * 62000, dy = (here.lat - l.lat) * 111000;
  const len = Math.hypot(dx, dy) || 1, k = Math.min(1, 220 / len);
  const x2 = 70 + dx * k, y2 = 90 + dy * k;
  return (
    <div className="mapcard" data-line={l.category}>
      <svg className="map" viewBox="0 0 320 180" role="img" aria-label={`Схема: вещь в ${meters(m)} от вас`}>
        <path d="M0 40 C80 30 140 60 320 44 M0 132 C110 120 200 150 320 128 M70 0 C78 60 60 120 82 180 M210 0 C200 70 236 110 220 180" stroke="#fff" strokeWidth="10" fill="none" />
        <path d="M0 40 C80 30 140 60 320 44 M0 132 C110 120 200 150 320 128" stroke="#dfe6df" strokeWidth="2" fill="none" />
        <rect x="100" y="60" width="64" height="44" rx="4" fill="#dfe8df" />
        <rect x="236" y="70" width="58" height="40" rx="4" fill="#dfe8df" />
        <line x1="70" y1="90" x2={Math.max(20, Math.min(300, x2))} y2={Math.max(20, Math.min(160, y2))} stroke="var(--line)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 9" />
        <circle cx={Math.max(20, Math.min(300, x2))} cy={Math.max(20, Math.min(160, y2))} r="11" fill="var(--line)" stroke="#fff" strokeWidth="3" />
        <circle cx="70" cy="90" r="9" fill="#ffcc00" stroke="#0f1b2d" strokeWidth="3" />
      </svg>
      <div>
        <b>{district(l.districtId).name} · {meters(m)} от вас</b>
        <span>Точный адрес владелец напишет в чате после подтверждения брони.</span>
      </div>
    </div>
  );
}

export function ListingRowTitle({l}: {l: Listing}) {
  return (
    <div>
      <Link to={`/listing/${l.id}`} className="t">{l.title}</Link>
      <div className="m">
        <LineBadge cat={l.category} />
        <span>{priceLine(l)}</span>
        <span>залог {rub(l.deposit)}</span>
      </div>
    </div>
  );
}

export const bookingTotal = (b: Booking) => b.rentAmount + b.commissionAmount;
