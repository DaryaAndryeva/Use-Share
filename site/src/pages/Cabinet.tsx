import {Plus} from 'lucide-react';
import {Link, NavLink, Navigate, useParams} from 'react-router-dom';
import {Picto, Plate} from '../art';
import {type Booking, PROMO_PRICE, category, dayLabel, dayShort, periodLabel, plural, rub} from '../data';
import {isPromoted, ownerOfListing, useStore} from '../store';
import {Empty, ListingRowTitle, StatusTag, bookingTotal, useAct} from '../ui';
import {NeedLogin} from './NewListing';

const TABS = [
  ['overview', 'Сводка'], ['rentals', 'Я беру'], ['bookings', 'У меня берут'], ['listings', 'Мои вещи'], ['requests', 'Мои «ищу»'], ['wallet', 'Платежи'],
] as const;

function DealRow({b, side}: {b: Booking; side: 'renter' | 'owner'}) {
  const s = useStore();
  const l = s.listing(b.listingId)!;
  const other = s.user(side === 'renter' ? l.ownerId : b.renterId);
  const attention = (side === 'owner' && (b.status === 'requested' || b.status === 'paid')) || (side === 'renter' && b.status === 'confirmed');
  return (
    <div className={'row' + (attention ? ' attention' : '')} data-line={l.category}>
      <Plate art={l.art} cat={l.category} size="m" />
      <div style={{minWidth: 0}}>
        <Link to={`/deal/${b.id}`} className="t">{l.title}</Link>
        <div className="m">
          <span className="num">{periodLabel(b.startsAt, b.endsAt)}</span>
          <span>{side === 'renter' ? 'у' : 'берёт'} {other.name}</span>
          <span className="num">{rub(side === 'owner' ? b.rentAmount : bookingTotal(b))}</span>
        </div>
      </div>
      <div className="r">
        <StatusTag s={b.status} side={side} />
        <Link to={`/deal/${b.id}`} className={'btn btn-s ' + (attention ? 'btn-go' : 'btn-line')}>
          {attention ? (side === 'owner' ? (b.status === 'requested' ? 'Ответить' : 'Отметить передачу') : 'Оплатить') : 'Открыть'}
        </Link>
      </div>
    </div>
  );
}

export function Cabinet() {
  const {tab = 'overview'} = useParams();
  const s = useStore();
  const act = useAct();
  if (!s.me) return <NeedLogin what="открыть кабинет" />;
  if (!TABS.some(([k]) => k === tab)) return <Navigate to="/me/overview" replace />;
  const me = s.me.id;
  const rentals = s.db.bookings.filter((b) => b.renterId === me).sort((a, b) => b.startsAt - a.startsAt);
  const incoming = s.db.bookings.filter((b) => ownerOfListing(s.db, b.listingId) === me).sort((a, b) => b.startsAt - a.startsAt);
  const listings = s.db.listings.filter((l) => l.ownerId === me);
  const requests = s.db.requests.filter((r) => r.authorId === me).sort((a, b) => b.createdAt - a.createdAt);
  const live = (b: Booking) => !['completed', 'rejected', 'cancelled'].includes(b.status);
  const toAnswer = incoming.filter((b) => b.status === 'requested').length;
  const toPay = rentals.filter((b) => b.status === 'confirmed').length;
  const earned = s.db.payments.filter((p) => p.kind === 'payout' && incoming.some((b) => b.id === p.bookingId)).reduce((a, p) => a + p.amount, 0);
  const counts: Record<string, number> = {rentals: toPay, bookings: toAnswer};

  let body: React.ReactNode;
  if (tab === 'overview') {
    const now = [...incoming, ...rentals].filter(live).sort((a, b) => a.startsAt - b.startsAt);
    body = (
      <>
        <div className="stats">
          <div className={'stat' + (toAnswer ? ' hl' : '')}><b className="num">{toAnswer}</b><span>{plural(toAnswer, 'запрос ждёт', 'запроса ждут', 'запросов ждут')} ответа</span></div>
          <div className="stat"><b className="num">{rentals.filter(live).length}</b><span>моих текущих аренд</span></div>
          <div className="stat"><b className="num">{listings.filter((l) => l.status === 'active').length}</b><span>вещей в каталоге</span></div>
          <div className="stat"><b className="num">{rub(earned)}</b><span>заработано на сервисе</span></div>
        </div>
        <div className="section-h"><h2 style={{fontSize: 22}}>Сейчас в работе</h2></div>
        {now.length ? (
          <div className="rows">{now.map((b) => <DealRow key={b.id} b={b} side={b.renterId === me ? 'renter' : 'owner'} />)}</div>
        ) : <Empty title="Активных сделок нет" action={<Link className="btn btn-ink" to="/catalog">Найти вещь</Link>}>Когда вы забронируете вещь или кто-то попросит вашу, сделка появится здесь.</Empty>}
      </>
    );
  } else if (tab === 'rentals' || tab === 'bookings') {
    const list = tab === 'rentals' ? rentals : incoming;
    body = list.length ? (
      <div className="rows">{list.map((b) => <DealRow key={b.id} b={b} side={tab === 'rentals' ? 'renter' : 'owner'} />)}</div>
    ) : <Empty title={tab === 'rentals' ? 'Вы ещё ничего не брали' : 'Ваши вещи пока никто не брал'} action={<Link className="btn btn-ink" to={tab === 'rentals' ? '/catalog' : '/new'}>{tab === 'rentals' ? 'В каталог' : 'Сдать вещь'}</Link>} />;
  } else if (tab === 'listings') {
    body = (
      <>
        <div style={{marginBottom: 16}}><Link className="btn btn-go" to="/new"><Plus size={18} />Сдать ещё вещь</Link></div>
        {listings.length ? (
          <div className="rows">
            {listings.map((l) => {
              const deals = s.db.bookings.filter((b) => b.listingId === l.id);
              return (
                <div key={l.id} className="row" data-line={l.category}>
                  <Plate art={l.art} cat={l.category} size="m" />
                  <ListingRowTitle l={l} />
                  <div className="r">
                    {l.status !== 'active' ? <span className="tag tag-off">{l.status === 'hidden' ? 'Скрыто модератором' : 'Снято'}</span> : null}
                    {isPromoted(l, s.now) ? <span className="tag tag-here">До {dayShort(l.promotedUntil!)}</span> : null}
                    <span className="muted num" style={{fontSize: 13}}>{deals.filter((b) => b.status === 'completed').length} аренд</span>
                    {l.status === 'active' && !isPromoted(l, s.now) ? <button type="button" className="btn btn-line btn-s" onClick={() => act(() => s.promote(l.id), `Продвижение на 7 дней оплачено (${rub(PROMO_PRICE)}, демо)`)}>Продвинуть · {rub(PROMO_PRICE)}</button> : null}
                    <Link to={`/edit/${l.id}`} className="btn btn-ghost btn-s">Изменить</Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <Empty title="Вы ещё ничего не сдаёте" action={<Link className="btn btn-go" to="/new">Сдать вещь</Link>}>Размещение бесплатное и занимает около трёх минут.</Empty>}
      </>
    );
  } else if (tab === 'requests') {
    body = (
      <>
        <div style={{marginBottom: 16}}><Link className="btn btn-ink" to="/request/new">Новый запрос «ищу»</Link></div>
        {requests.length ? (
          <div className="rows">
            {requests.map((r) => {
              const offers = s.db.messages.filter((m) => m.renterId === me && m.sender === 'owner' && m.body.includes(`«${r.description}»`)).length;
              return (
                <div key={r.id} className="row" data-line={r.category}>
                  <span className="plate plate-m"><Picto name={r.category} size={30} /></span>
                  <div><b className="t">{r.description}</b><div className="m"><span>{category(r.category).name}</span><span className="num">{dayLabel(r.startsAt)} — {dayLabel(r.endsAt)}</span><span>{offers} {plural(offers, 'предложение', 'предложения', 'предложений')} в чатах</span></div></div>
                  <div className="r">
                    {r.closedAt ? <span className="tag tag-off">Закрыт</span> : <><span className="tag tag-go">Открыт</span><button type="button" className="btn btn-line btn-s" onClick={() => act(() => s.closeRequest(r.id), 'Запрос снят')}>Снять</button></>}
                    {offers ? <Link className="btn btn-go btn-s" to="/chats">К предложениям</Link> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <Empty title="Запросов нет" action={<Link className="btn btn-ink" to="/request/new">Оставить запрос</Link>}>Если вещи нет в каталоге — оставьте «ищу», и соседи сами предложат.</Empty>}
      </>
    );
  } else {
    const mine = s.db.payments
      .map((p) => ({p, b: s.db.bookings.find((x) => x.id === p.bookingId)!}))
      .filter(({p, b}) => (b.renterId === me && ['rent', 'deposit_hold', 'deposit_release'].includes(p.kind)) || (p.kind === 'payout' && ownerOfListing(s.db, b.listingId) === me))
      .sort((a, b) => b.p.createdAt - a.p.createdAt);
    const label = {rent: 'Оплата аренды', deposit_hold: 'Залог удержан', deposit_release: 'Залог вернулся', payout: 'Выплата за аренду'};
    body = mine.length ? (
      <table className="table">
        <thead><tr><th>Дата</th><th>Операция</th><th>Вещь</th><th style={{textAlign: 'right'}}>Сумма</th></tr></thead>
        <tbody>
          {mine.map(({p, b}) => {
            const plus = p.kind === 'payout' || p.kind === 'deposit_release';
            return (
              <tr key={p.id}>
                <td className="num">{dayShort(p.createdAt)}</td>
                <td>{label[p.kind]}</td>
                <td><Link to={`/deal/${b.id}`}>{s.listing(b.listingId)!.title}</Link></td>
                <td className="n" style={{color: plus ? 'var(--go)' : undefined, fontWeight: 700}}>{plus ? '+' : '−'}{rub(p.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    ) : <Empty title="Платежей пока нет" />;
  }

  return (
    <>
      <div className="pagehead">
        <div><h1>{s.me.name}</h1><p>Арендатор и владелец в одном аккаунте. Всё, что ждёт вашего действия, подсвечено жёлтым.</p></div>
        <div className="actions"><button type="button" className="btn btn-ghost" onClick={() => s.logout()}>Выйти</button></div>
      </div>
      <nav className="tabs" aria-label="Разделы кабинета">
        {TABS.map(([k, t]) => <NavLink key={k} to={`/me/${k}`}>{t}{counts[k] ? <span className="count">{counts[k]}</span> : null}</NavLink>)}
      </nav>
      {body}
    </>
  );
}
