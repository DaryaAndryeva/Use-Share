import {Send} from 'lucide-react';
import * as React from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {Picto, Plate} from '../art';
import {CATEGORIES, type CategorySlug, DAY, DISTRICTS, type SearchRequest, category, dayLabel, district, metersBetween, plural, priceLine, rub} from '../data';
import {useStore} from '../store';
import {Ava, Empty, Note, RouteLine, Sheet, useAct} from '../ui';
import {NeedLogin} from './NewListing';

const toLocal = (t: number) => new Date(t - new Date(t).getTimezoneOffset() * 60e3).toISOString().slice(0, 16);

export function Requests() {
  const s = useStore();
  const nav = useNavigate();
  const act = useAct();
  const [cat, setCat] = React.useState<CategorySlug | 'all'>('all');
  const [offerFor, setOfferFor] = React.useState<SearchRequest | null>(null);
  const open = s.db.requests.filter((r) => !r.closedAt && r.endsAt > s.now && (cat === 'all' || r.category === cat))
    .sort((a, b) => s.distanceTo(a) - s.distanceTo(b));
  const mineListings = s.me ? s.db.listings.filter((l) => l.ownerId === s.me!.id && l.status === 'active') : [];
  const offer = (r: SearchRequest, listingId: number) => {
    const id = act(() => s.offer(r.id, listingId), 'Предложение отправлено в чат');
    setOfferFor(null);
    if (id) nav(`/chats/${id}`);
  };
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Люди ищут</h1>
          <p>Запросы соседей, которые не нашли вещь в каталоге. Есть такая? Отправьте своё объявление — у автора откроется чат с вами.</p>
        </div>
        <div className="actions"><Link className="btn btn-ink" to="/request/new">Оставить свой запрос</Link></div>
      </div>
      <div className="chips" style={{marginBottom: 20}}>
        <button type="button" className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Все</button>
        {CATEGORIES.map((c) => <button key={c.slug} type="button" className="chip" data-line={c.slug} aria-pressed={cat === c.slug} onClick={() => setCat(c.slug)}><i />{c.short}</button>)}
      </div>
      {open.length ? (
        <div className="rows">
          {open.map((r) => {
            const u = s.user(r.authorId);
            const own = s.me?.id === r.authorId;
            return (
              <div key={r.id} className="row" data-line={r.category}>
                <span className="plate plate-m"><Picto name={r.category} size={30} /></span>
                <div style={{minWidth: 0}}>
                  <b className="t">{r.description}</b>
                  <div className="m">
                    <span style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}><Ava name={u.name} small />{own ? 'Ваш запрос' : u.name.split(' ')[0]}</span>
                    <span className="num">{dayLabel(r.startsAt)} — {dayLabel(r.endsAt)}</span>
                    <span>{r.maxPrice ? `до ${rub(r.maxPrice)} за срок` : 'цена договорная'}</span>
                    <RouteLine m={s.distanceTo(r)} cat={r.category} />
                  </div>
                </div>
                <div className="r">
                  {own ? (
                    <button type="button" className="btn btn-line btn-s" onClick={() => act(() => s.closeRequest(r.id), 'Запрос снят')}>Снять запрос</button>
                  ) : (
                    <button type="button" className="btn btn-go btn-s" onClick={() => (s.me ? setOfferFor(r) : nav('/login'))}><Send size={16} />Предложить вещь</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty title="Сейчас никто ничего не ищет" action={<Link className="btn btn-ink" to="/request/new">Оставить запрос</Link>}>В этой категории открытых запросов нет.</Empty>
      )}

      {offerFor ? (
        <Sheet title="Какую вещь предложить?" onClose={() => setOfferFor(null)}>
          <p className="muted">«{offerFor.description}» · {dayLabel(offerFor.startsAt)} — {dayLabel(offerFor.endsAt)}</p>
          {mineListings.length ? (
            <div className="rows">
              {[...mineListings].sort((a, b) => Number(b.category === offerFor.category) - Number(a.category === offerFor.category)).map((l) => (
                <div key={l.id} className="row" data-line={l.category}>
                  <Plate art={l.art} cat={l.category} size="m" />
                  <div style={{minWidth: 0}}>
                    <b className="t">{l.title}</b>
                    <div className="m"><span>{priceLine(l)}</span>{l.category === offerFor.category ? <span className="tag tag-go">та же категория</span> : null}</div>
                  </div>
                  <div className="r"><button type="button" className="btn btn-go btn-s" onClick={() => offer(offerFor, l.id)}>Отправить</button></div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="У вас пока нет объявлений" action={<Link className="btn btn-go" to={`/new?cat=${offerFor.category}`}>Разместить вещь</Link>}>Сначала разместите вещь — потом её можно будет предложить.</Empty>
          )}
          <Note>Автор получит ваше объявление первым сообщением в чате и сможет сразу забронировать.</Note>
        </Sheet>
      ) : null}
    </>
  );
}

export function NewRequest() {
  const s = useStore();
  const nav = useNavigate();
  const act = useAct();
  const [qp] = useSearchParams();
  const [cat, setCat] = React.useState<CategorySlug | null>((qp.get('cat') as CategorySlug) ?? null);
  const [desc, setDesc] = React.useState(qp.get('q') ?? '');
  const st0 = Number(qp.get('start')) || s.now + DAY;
  const [a, setA] = React.useState(qp.get('start') ? toLocal(st0) : '');
  const [b, setB] = React.useState(qp.get('end') ? toLocal(Number(qp.get('end'))) : '');
  const [max, setMax] = React.useState('');
  const [dist, setDist] = React.useState(s.me?.districtId ?? 1);
  const [tried, setTried] = React.useState(false);
  if (!s.me) return <NeedLogin what="оставить запрос «ищу»" />;
  const ta = new Date(a).getTime(), tb = new Date(b).getTime();
  const errs = {cat: !cat ? 'Выберите категорию' : '', period: !a || !b ? 'Укажите, когда нужна вещь' : tb <= ta ? 'Конец должен быть позже начала' : ''};
  const d = district(dist);
  const owners = cat ? new Set(s.db.listings.filter((l) => l.category === cat && l.status === 'active' && l.ownerId !== s.me!.id && metersBetween(d, l) <= 5000).map((l) => l.ownerId)).size : 0;
  const submit = () => {
    setTried(true);
    if (errs.cat || errs.period) return;
    const id = act(() => s.createRequest({category: cat!, description: desc.trim() || category(cat!).name, startsAt: ta, endsAt: tb, maxPrice: max ? Number(max) : null, districtId: dist}),
      owners ? `Запрос опубликован: ${owners} ${plural(owners, 'владелец', 'владельца', 'владельцев')} рядом получат уведомление` : 'Запрос опубликован');
    if (id) nav('/requests');
  };
  return (
    <>
      <div className="pagehead"><div><h1>Ищу вещь</h1><p>Опишите, что нужно и когда. Владельцы этой категории в радиусе 5 км получат уведомление и пришлют предложения в чат.</p></div></div>
      <div className="formgrid">
        <div className="formcol">
          <section className="fs">
            <div className={'field' + (tried && errs.cat ? ' bad' : '')}>
              <span>Категория</span>
              <div className="catpick">
                {CATEGORIES.map((c) => (
                  <button key={c.slug} type="button" aria-pressed={cat === c.slug} onClick={() => setCat(c.slug)} data-line={c.slug}>
                    <span className="plate"><Picto name={c.slug} size={22} /></span>{c.name}
                  </button>
                ))}
              </div>
              {tried && errs.cat ? <small>{errs.cat}</small> : null}
            </div>
            <label className="field"><span>Что именно</span><textarea className="textarea" style={{minHeight: 84}} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Например, пароочиститель для уборки после ремонта" /></label>
            <div className={'two field' + (tried && errs.period ? ' bad' : '')} style={{display: 'grid'}}>
              <label className="field"><span>С</span><input className="input" type="datetime-local" value={a} onChange={(e) => setA(e.target.value)} /></label>
              <label className="field"><span>По</span><input className="input" type="datetime-local" value={b} onChange={(e) => setB(e.target.value)} /></label>
              {tried && errs.period ? <small style={{gridColumn: '1 / -1'}}>{errs.period}</small> : null}
            </div>
            <div className="two">
              <label className="field"><span>Бюджет за весь срок, ₽</span><input className="input num" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} placeholder="Необязательно" /></label>
              <label className="field"><span>Район</span><select className="select" value={dist} onChange={(e) => setDist(+e.target.value)}>{DISTRICTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            </div>
            <button type="button" className="btn btn-go btn-l" style={{justifySelf: 'start'}} onClick={submit}>Опубликовать запрос</button>
          </section>
        </div>
        <aside className="preview">
          <b>Кто получит уведомление</b>
          <div className="panel">
            <b style={{fontSize: 34, fontWeight: 800}} className="num">{cat ? owners : '—'}</b>
            <span className="muted">{cat ? `${plural(owners, 'владелец', 'владельца', 'владельцев')} с вещами «${category(cat).short}» в 5 км от района ${d.name}` : 'Выберите категорию'}</span>
          </div>
          <Note>Когда найдёте вещь, снимите запрос — владельцы перестанут его видеть.</Note>
        </aside>
      </div>
    </>
  );
}
