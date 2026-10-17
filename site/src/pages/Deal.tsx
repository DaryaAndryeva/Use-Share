import {Camera, Check, MessageCircle, ShieldCheck, X} from 'lucide-react';
import * as React from 'react';
import {Link, useParams} from 'react-router-dom';
import {Plate} from '../art';
import {type PaymentKind, STAGES, STATUS, dayShort, district, periodLabel, rub, timeLabel} from '../data';
import {useStore} from '../store';
import {Ava, Note, Sheet, StatusTag, bookingTotal, useAct} from '../ui';
import {NeedLogin} from './NewListing';

const KIND: Record<PaymentKind, string> = {rent: 'Оплата аренды и комиссии', deposit_hold: 'Залог удержан', deposit_release: 'Залог возвращён', payout: 'Выплата владельцу'};

export function Deal() {
  const {id} = useParams();
  const s = useStore();
  const act = useAct();
  const [sheet, setSheet] = React.useState<'pay' | 'handover' | 'return' | null>(null);
  const [photos, setPhotos] = React.useState(2);
  const [busy, setBusy] = React.useState(false);
  const key = React.useRef(`pay-${id}-${Math.random().toString(36).slice(2, 8)}`);
  if (!s.me) return <NeedLogin what="посмотреть сделку" />;
  const b = s.db.bookings.find((x) => x.id === Number(id));
  const l = b ? s.listing(b.listingId) : undefined;
  if (!b || !l || (b.renterId !== s.me.id && l.ownerId !== s.me.id && s.me.role !== 'moderator')) {
    return <div className="empty"><h3>Сделка не найдена</h3><Link className="btn btn-ink" to="/me">В кабинет</Link></div>;
  }
  const iOwn = l.ownerId === s.me.id, iRent = b.renterId === s.me.id;
  const renter = s.user(b.renterId), owner = s.user(l.ownerId);
  const other = iOwn ? renter : owner;
  const off = b.status === 'rejected' || b.status === 'cancelled';
  const idx = off ? 0 : STAGES.findIndex((x) => x.key === b.status);
  const pays = s.db.payments.filter((p) => p.bookingId === b.id);
  const contacts = ['confirmed', 'paid', 'handed_over', 'completed'].includes(b.status);
  const pay = () => {
    if (busy) return;
    setBusy(true);
    // имитация ответа провайдера; ключ один на всю попытку — двойной клик не спишет дважды
    setTimeout(() => {
      act(() => s.pay(b.id, key.current), 'Оплачено. Залог удержан до возврата вещи');
      setBusy(false);
      setSheet(null);
    }, 700);
  };

  let next: React.ReactNode = null;
  if (b.status === 'requested' && iOwn) {
    next = (
      <>
        <p>{renter.name.split(' ')[0]} просит вещь на {periodLabel(b.startsAt, b.endsAt)}. Если подтвердите, эти даты закроются для других.</p>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
          <button type="button" className="btn btn-go" onClick={() => act(() => s.decide(b.id, true), 'Бронь подтверждена, контакты открыты')}><Check size={18} />Подтвердить</button>
          <button type="button" className="btn btn-danger" onClick={() => act(() => s.decide(b.id, false), 'Запрос отклонён')}><X size={18} />Отклонить</button>
        </div>
      </>
    );
  } else if (b.status === 'requested' && iRent) {
    next = (<><p>Ждём ответа владельца. Деньги спишутся только после подтверждения.</p><button type="button" className="btn btn-line" onClick={() => act(() => s.cancel(b.id), 'Запрос отменён')}>Отменить запрос</button></>);
  } else if (b.status === 'confirmed' && iRent) {
    next = (
      <>
        <p>Владелец подтвердил. Оплатите аренду и внесите залог — после этого можно встречаться.</p>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
          <button type="button" className="btn btn-go btn-l" onClick={() => setSheet('pay')}>Оплатить {rub(bookingTotal(b) + b.depositAmount)}</button>
          <button type="button" className="btn btn-ghost" onClick={() => act(() => s.cancel(b.id), 'Бронь отменена')}>Отменить</button>
        </div>
      </>
    );
  } else if (b.status === 'confirmed' && iOwn) {
    next = <p>Ждём оплату от {renter.name.split(' ')[0]}. Отметить передачу можно после оплаты.</p>;
  } else if (b.status === 'paid' && iOwn) {
    next = (<><p>Оплата и залог получены. Встретьтесь и отметьте передачу — лучше с фото состояния вещи.</p><button type="button" className="btn btn-go btn-l" onClick={() => setSheet('handover')}><Camera size={18} />Вещь передана</button></>);
  } else if (b.status === 'paid' && iRent) {
    next = <p>Оплачено. Договоритесь о встрече в чате — контакты владельца открыты.</p>;
  } else if (b.status === 'handed_over' && iOwn) {
    next = (<><p>Вещь у арендатора до {dayShort(b.endsAt)}, {timeLabel(b.endsAt)}. Когда вернут — подтвердите возврат, и залог уйдёт арендатору.</p><button type="button" className="btn btn-go btn-l" onClick={() => setSheet('return')}><Check size={18} />Вещь вернули</button></>);
  } else if (b.status === 'handed_over' && iRent) {
    next = <p>Верните вещь до {dayShort(b.endsAt)}, {timeLabel(b.endsAt)}. Залог вернётся, когда владелец подтвердит возврат.</p>;
  } else if (b.status === 'completed') {
    next = <p>Сделка завершена {b.completedAt ? dayShort(b.completedAt) : ''}. {iRent ? `Залог ${rub(b.depositAmount)} вернулся на карту.` : `Выплата ${rub(b.rentAmount)} отправлена на карту.`}</p>;
  } else if (off) {
    next = <p>{b.status === 'rejected' ? 'Владелец отклонил запрос. Посмотрите похожие вещи рядом.' : 'Бронь отменена, деньги не списывались.'}</p>;
  }

  return (
    <>
      <nav className="crumbs"><Link to={iOwn ? '/me/bookings' : '/me/rentals'}>{iOwn ? 'У меня берут' : 'Мои аренды'}</Link>›<span>Сделка № {b.id}</span></nav>
      <div className="pagehead">
        <div>
          <h1>{l.title}</h1>
          <p className="num">{periodLabel(b.startsAt, b.endsAt)} · {district(l.districtId).name}</p>
        </div>
        <div className="actions"><StatusTag s={b.status} side={iOwn ? 'owner' : 'renter'} /></div>
      </div>
      <div className="deal">
        <div>
          <div className={'stations' + (off ? ' off' : '')} aria-label={`Статус: ${STATUS[b.status].label}`}>
            <span className="fill" style={{width: `${(idx / 4) * 80}%`}} />
            {STAGES.map((st, i) => (
              <div key={st.key} className={'station' + (i < idx || b.status === 'completed' ? ' done' : '') + (i === idx && b.status !== 'completed' ? ' cur' : '')}>
                <i>{i < idx || b.status === 'completed' ? <Check size={14} strokeWidth={4} color="var(--go)" /> : null}</i>
                <span>{off && i === 0 ? STATUS[b.status].label.split(' ')[0] : st.label}</span>
              </div>
            ))}
          </div>
          <div className="panel panel-ink">
            <h2>{off ? 'Сделка остановлена' : b.status === 'completed' ? 'Готово' : 'Что дальше'}</h2>
            {next}
          </div>
          <div className="panel" style={{marginTop: 16}}>
            <h2>Деньги</h2>
            <div className="bill">
              <div><span>Аренда</span><span>{rub(b.rentAmount)}</span></div>
              <div><span>Комиссия сервиса 10 %</span><span>{rub(b.commissionAmount)}</span></div>
              <div className="total"><span>{iOwn ? 'Платит арендатор' : 'К оплате'}</span><span>{rub(bookingTotal(b))}</span></div>
              <div className="dep"><span>Залог — удерживается и возвращается</span><span>{rub(b.depositAmount)}</span></div>
              {iOwn ? <div><span>Вы получите</span><b>{rub(b.rentAmount)}</b></div> : null}
            </div>
            {pays.length ? (
              <div className="ops" aria-label="Операции">
                {pays.map((p) => (
                  <div key={p.id} className="op">
                    <b>{KIND[p.kind]}</b>
                    <span className={'amt' + (p.kind === 'deposit_release' || (p.kind === 'payout' && iOwn) ? ' in' : '')}>{rub(p.amount)}</span>
                    <small>{dayShort(p.createdAt)}, {timeLabel(p.createdAt)} · {p.providerPaymentId}</small>
                    <small style={{textAlign: 'right'}}>{p.status === 'succeeded' ? 'проведено' : p.status}</small>
                  </div>
                ))}
              </div>
            ) : <Note>Операций пока нет: деньги спишутся только после подтверждения брони.</Note>}
          </div>
          {b.handoverPhotos || b.returnPhotos ? (
            <div className="panel" style={{marginTop: 16}}>
              <h2>Фото состояния</h2>
              {b.handoverPhotos ? <div><p className="muted" style={{marginBottom: 8}}>При передаче</p><div className="photosrow">{Array.from({length: b.handoverPhotos}, (_, i) => <Plate key={i} art={l.art} cat={l.category} size="m" />)}</div></div> : null}
              {b.returnPhotos ? <div><p className="muted" style={{marginBottom: 8}}>При возврате</p><div className="photosrow">{Array.from({length: b.returnPhotos}, (_, i) => <Plate key={i} art={l.art} cat={l.category} size="m" />)}</div></div> : null}
            </div>
          ) : null}
        </div>
        <aside style={{display: 'grid', gap: 16}}>
          <div className="panel" data-line={l.category}>
            <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
              <Plate art={l.art} cat={l.category} size="m" />
              <div><Link to={`/listing/${l.id}`} style={{fontWeight: 700}}>{l.title}</Link><p className="muted" style={{fontSize: 14}}>залог {rub(l.deposit)}</p></div>
            </div>
          </div>
          <div className="panel">
            <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
              <Ava name={other.name} />
              <div>
                <b>{other.name}</b>
                <p className="muted" style={{fontSize: 14}}>{iOwn ? 'арендатор' : 'владелец'} · {district(other.districtId).name}</p>
              </div>
            </div>
            {contacts ? <div className="alert alert-ok"><ShieldCheck size={18} />Telegram: @{other.username}</div> : <Note>Контакты откроются после подтверждения брони.</Note>}
            <Link className="btn btn-line" to={`/chats/${l.id}/${b.renterId}`}><MessageCircle size={18} />Открыть чат</Link>
          </div>
        </aside>
      </div>

      {sheet === 'pay' ? (
        <Sheet title="Оплата и залог" onClose={() => !busy && setSheet(null)}>
          <div className="bill">
            <div><span>Аренда</span><span>{rub(b.rentAmount)}</span></div>
            <div><span>Комиссия 10 %</span><span>{rub(b.commissionAmount)}</span></div>
            <div><span>Залог (вернётся)</span><span>{rub(b.depositAmount)}</span></div>
            <div className="total"><span>Спишется сейчас</span><span>{rub(bookingTotal(b) + b.depositAmount)}</span></div>
          </div>
          <Note>Демо-песочница платёжного провайдера: карта не нужна, деньги не списываются. Данные карт сервис не хранит.</Note>
          <button type="button" className="btn btn-go btn-l" onClick={pay} disabled={busy} aria-busy={busy}>{busy ? 'Проводим платёж…' : 'Оплатить'}</button>
        </Sheet>
      ) : null}
      {sheet === 'handover' || sheet === 'return' ? (
        <Sheet title={sheet === 'handover' ? 'Отметить передачу' : 'Подтвердить возврат'} onClose={() => setSheet(null)}>
          <p>{sheet === 'handover' ? 'Сфотографируйте вещь при арендаторе — так проще решать споры.' : 'Проверьте вещь. После подтверждения залог вернётся арендатору, а вам придёт оплата.'}</p>
          <div className="photos">
            {Array.from({length: photos}, (_, i) => <div key={i} className="photo"><Plate art={l.art} cat={l.category} size="l" /><button type="button" onClick={() => setPhotos((n) => n - 1)} aria-label="Убрать фото"><X size={14} /></button></div>)}
            {photos < 6 ? <button type="button" className="addphoto" onClick={() => setPhotos((n) => n + 1)}><Camera size={22} />Фото</button> : null}
          </div>
          <button type="button" className="btn btn-go btn-l" onClick={() => {
            act(() => (sheet === 'handover' ? s.handover(b.id, photos) : s.returned(b.id, photos)), sheet === 'handover' ? 'Передача отмечена' : 'Сделка завершена, залог вернулся арендатору');
            setSheet(null);
          }}>{sheet === 'handover' ? 'Вещь передана' : 'Вещь вернули, всё в порядке'}</button>
        </Sheet>
      ) : null}
    </>
  );
}
