import {SlidersHorizontal, X} from 'lucide-react';
import * as React from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {CATEGORIES, type CategorySlug, DAY, DISTRICTS, HOUR, type Listing, district, metersBetween, plural} from '../data';
import {isPromoted, useStore} from '../store';
import {Empty, ItemCard, ItemRow} from '../ui';

const BANDS: [number, string][] = [[500, 'До 500 м — пара минут'], [1000, 'До 1 км'], [2000, 'До 2 км — пешком'], [5000, 'До 5 км'], [Infinity, 'Дальше 5 км']];
const STOPS = [{m: 0, label: 'вы'}, {m: 500, label: '500 м'}, {m: 1000, label: '1 км'}, {m: 2000, label: '2 км'}, {m: 5000, label: '5 км'}];

/** Период из пресета или из явных дат. */
export function periodFrom(when: string | null, start: string | null, end: string | null, now: number): [number, number] | null {
  if (start && end) {
    const a = new Date(start).getTime(), b = new Date(end).getTime();
    return a && b && b > a ? [a, b] : null;
  }
  const d = new Date(now);
  if (when === 'today') {
    const e = new Date(now);
    e.setHours(23, 0, 0, 0);
    return [now, Math.max(e.getTime(), now + 2 * HOUR)];
  }
  if (when === 'weekend') {
    const add = (6 - d.getDay() + 7) % 7 || (d.getDay() === 6 ? 0 : 7);
    const sat = new Date(now + add * DAY);
    sat.setHours(10, 0, 0, 0);
    return [Math.max(sat.getTime(), now), sat.getTime() + DAY + 10 * HOUR];
  }
  if (when === 'week') return [now, now + 7 * DAY];
  return null;
}
const toLocal = (t: number) => {
  const d = new Date(t - new Date(t).getTimezoneOffset() * 60e3);
  return d.toISOString().slice(0, 16);
};

export function Catalog() {
  const s = useStore();
  const [p, setP] = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const q = p.get('q') ?? '';
  const cat = (p.get('cat') ?? 'all') as CategorySlug | 'all';
  const when = p.get('when');
  const from = Number(p.get('from') ?? s.me?.districtId ?? 1);
  const dist = Number(p.get('dist') ?? 0);
  const max = p.get('max') ? Number(p.get('max')) : null;
  const hourly = p.get('hourly') === '1';
  const sort = p.get('sort') ?? 'near';
  const grid = p.get('view') === 'grid';
  const period = periodFrom(when, p.get('start'), p.get('end'), s.now);
  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(p);
    if (v === null || v === '') n.delete(k);
    else n.set(k, v);
    if (k === 'when') {
      n.delete('start');
      n.delete('end');
    }
    setP(n, {replace: true});
  };
  const origin = district(from);
  const mOf = (l: Listing) => metersBetween(origin, l);

  const base = s.db.listings.filter((l) => l.status === 'active' && s.user(l.ownerId) && !s.user(l.ownerId).isBlocked);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (l: Listing) =>
    (cat === 'all' || l.category === cat) &&
    words.every((w) => `${l.title} ${l.description} ${l.kit.join(' ')}`.toLowerCase().includes(w)) &&
    (!dist || mOf(l) <= dist) &&
    (!max || (l.priceDay ?? l.priceHour! * 24) <= max) &&
    (!hourly || !!l.priceHour) &&
    (!period || s.isFree(l.id, period[0], period[1]));
  let list = base.filter(matches);
  list.sort((a, b) =>
    sort === 'cheap' ? (a.priceDay ?? a.priceHour! * 24) - (b.priceDay ?? b.priceHour! * 24) : sort === 'new' ? b.createdAt - a.createdAt : mOf(a) - mOf(b));
  // продвигаемые — в первые три места выдачи категории (FR-09)
  const promo = list.filter((l) => isPromoted(l, s.now)).slice(0, 3);
  list = [...promo, ...list.filter((l) => !promo.includes(l))];
  const carry = period ? `?start=${period[0]}&end=${period[1]}` : '';
  const counts = (slug: CategorySlug) => base.filter((l) => l.category === slug).length;
  const activeFilters = [cat !== 'all', !!dist, !!max, hourly, !!period].filter(Boolean).length;
  const requestLink = `/request/new?${new URLSearchParams({...(q ? {q} : {}), ...(cat !== 'all' ? {cat} : {}), ...(period ? {start: String(period[0]), end: String(period[1])} : {})})}`;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{cat === 'all' ? 'Вещи рядом' : CATEGORIES.find((c) => c.slug === cat)!.name}</h1>
          <p>{q ? <>По запросу «{q}». </> : null}Расстояние считаем от района {origin.name}{period ? ', показываем только свободные на выбранные даты' : ''}.</p>
        </div>
        <div className="actions"><Link className="btn btn-line" to={requestLink}>Не нашли? Оставьте «ищу»</Link></div>
      </div>
      <div className="mfilters">
        <button type="button" className="btn btn-line btn-s" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
          <SlidersHorizontal size={16} />Фильтры{activeFilters ? ` · ${activeFilters}` : ''}
        </button>
        {activeFilters ? <button type="button" className="btn btn-ghost btn-s" onClick={() => setP(q ? {q} : {}, {replace: true})}><X size={16} />Сбросить</button> : null}
      </div>
      <div className="catalog">
        <aside className={'filters' + (open ? ' open' : '')} aria-label="Фильтры">
          <div className="fgroup">
            <b>Категория</b>
            <div className="catlist">
              <button type="button" className="catbtn" aria-pressed={cat === 'all'} onClick={() => set('cat', null)}>Все вещи<small>{base.length}</small></button>
              {CATEGORIES.map((c) => (
                <button key={c.slug} type="button" className="catbtn" data-line={c.slug} aria-pressed={cat === c.slug} onClick={() => set('cat', c.slug)}>
                  <i />{c.name}<small>{counts(c.slug)}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <b>Когда нужна</b>
            <div className="chips">
              {[['today', 'Сегодня'], ['weekend', 'Выходные'], ['week', 'Неделя']].map(([id, label]) => (
                <button key={id} type="button" className="chip" aria-pressed={when === id && !p.get('start')} onClick={() => set('when', when === id ? null : id)}>{label}</button>
              ))}
            </div>
            <div className="two">
              <label className="field"><span className="sr">Начало</span>
                <input className="input" type="datetime-local" aria-label="Начало аренды" value={period ? toLocal(period[0]) : ''} onChange={(e) => {
                  const n = new URLSearchParams(p);
                  n.delete('when');
                  n.set('start', e.target.value);
                  if (!n.get('end') && e.target.value) n.set('end', toLocal(new Date(e.target.value).getTime() + DAY));
                  setP(n, {replace: true});
                }} />
              </label>
              <label className="field"><span className="sr">Конец</span>
                <input className="input" type="datetime-local" aria-label="Конец аренды" value={period ? toLocal(period[1]) : ''} onChange={(e) => {
                  const n = new URLSearchParams(p);
                  n.delete('when');
                  if (!n.get('start') && period) n.set('start', toLocal(period[0]));
                  n.set('end', e.target.value);
                  setP(n, {replace: true});
                }} />
              </label>
            </div>
          </div>
          <div className="fgroup">
            <b>Насколько далеко</b>
            <div className="distline">
              <div className="distline-track"><span className="distline-fill" style={{width: `${dist ? (STOPS.findIndex((x) => x.m === dist) / 4) * 100 : 100}%`}} /></div>
              <div className="diststops">
                {STOPS.map((x, i) => {
                  const on = !dist || x.m <= dist;
                  return (
                    <button key={x.m} type="button" className={'diststop' + (on ? ' on' : '')} aria-pressed={i > 0 && dist === x.m} disabled={i === 0}
                      onClick={() => set('dist', dist === x.m ? null : String(x.m))} aria-label={i === 0 ? 'Вы здесь' : `Не дальше ${x.label}`}>
                      <i />{x.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="field">
              <span className="sr">Откуда считать</span>
              <select className="select" value={from} onChange={(e) => set('from', e.target.value)} aria-label="Откуда считать расстояние">
                {DISTRICTS.map((x) => <option key={x.id} value={x.id}>от: {x.name}</option>)}
              </select>
            </label>
          </div>
          <div className="fgroup">
            <b>Цена за сутки, до</b>
            <input className="input" inputMode="numeric" placeholder="Любая" value={max ?? ''} onChange={(e) => set('max', e.target.value.replace(/\D/g, ''))} aria-label="Максимальная цена за сутки, рублей" />
            <label className="check"><input type="checkbox" checked={hourly} onChange={(e) => set('hourly', e.target.checked ? '1' : null)} />Можно взять на час</label>
          </div>
        </aside>

        <section aria-label="Результаты">
          <div className="results-h">
            <b className="num">{list.length} {plural(list.length, 'вещь', 'вещи', 'вещей')}</b>
            <div className="seg-s" role="group" aria-label="Вид">
              <button type="button" aria-pressed={!grid} onClick={() => set('view', null)}>Списком</button>
              <button type="button" aria-pressed={grid} onClick={() => set('view', 'grid')}>Плиткой</button>
            </div>
            <select className="select" value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Сортировка">
              <option value="near">Сначала ближе</option>
              <option value="cheap">Сначала дешевле</option>
              <option value="new">Сначала новые</option>
            </select>
          </div>
          {list.length ? (
            grid ? (
              <div className="items">{list.map((l) => <ItemCard key={l.id} l={l} q={carry} />)}</div>
            ) : (
              <div className="irows">
                {BANDS.map(([lim, label], i) => {
                  const prev = i ? BANDS[i - 1][0] : -1;
                  const band = sort === 'near' ? list.filter((l) => !promo.includes(l) && mOf(l) > prev && mOf(l) <= lim) : i === 0 ? list : [];
                  const head = sort === 'near' && i === 0 && promo.length ? [...promo, ...band] : band;
                  if (!head.length) return null;
                  return (
                    <section key={lim} className="band" aria-label={sort === 'near' ? label : 'Результаты'}>
                      {sort === 'near' ? <h3 className="band-h"><i />{label}<small>{band.length} {plural(band.length, 'вещь', 'вещи', 'вещей')}</small></h3> : null}
                      {head.map((l) => <ItemRow key={l.id} l={l} q={carry} m={mOf(l)} />)}
                    </section>
                  );
                })}
              </div>
            )
          ) : (
            <Empty title="Рядом такой вещи нет" action={<Link className="btn btn-ink" to={requestLink}>Создать запрос «ищу»</Link>}>
              Расширьте расстояние или даты — или оставьте запрос: соседи, у которых найдётся такая вещь, сами напишут вам в чат.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
