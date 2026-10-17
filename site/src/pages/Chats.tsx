import {ArrowLeft, EyeOff, Send} from 'lucide-react';
import * as React from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {Plate} from '../art';
import {BLOCKING, dayShort, maskContacts, timeLabel} from '../data';
import {ownerOfListing, useStore} from '../store';
import {nextAction, statusFor, useAct} from '../ui';
import {NeedLogin} from './NewListing';

export function Chats() {
  const s = useStore();
  const act = useAct();
  const nav = useNavigate();
  const p = useParams();
  const [text, setText] = React.useState('');
  const box = React.useRef<HTMLDivElement>(null);
  const cur = p.listingId ? {listingId: Number(p.listingId), renterId: Number(p.renterId)} : null;
  const msgs = cur ? s.db.messages.filter((m) => m.listingId === cur.listingId && m.renterId === cur.renterId) : [];
  React.useEffect(() => {
    box.current?.scrollTo({top: box.current.scrollHeight});
  }, [msgs.length, p.listingId, p.renterId]);
  if (!s.me) return <NeedLogin what="переписываться" />;
  const me = s.me.id;
  const mine = s.db.chats
    .filter((c) => c.renterId === me || ownerOfListing(s.db, c.listingId) === me)
    .map((c) => {
      const m = s.db.messages.filter((x) => x.listingId === c.listingId && x.renterId === c.renterId);
      return {...c, last: m[m.length - 1], at: m.length ? m[m.length - 1].createdAt : c.createdAt};
    })
    .sort((a, b) => b.at - a.at);

  const l = cur ? s.listing(cur.listingId) : undefined;
  const ownerId = l ? l.ownerId : 0;
  const allowed = cur && l && (cur.renterId === me || ownerId === me);
  const iAmRenter = cur?.renterId === me;
  const other = cur && l ? s.user(iAmRenter ? ownerId : cur.renterId) : null;
  const bookings = cur ? s.db.bookings.filter((b) => b.listingId === cur.listingId && b.renterId === cur.renterId).sort((a, b) => b.createdAt - a.createdAt) : [];
  const unlocked = bookings.some((b) => [...BLOCKING, 'completed'].includes(b.status));
  const active = bookings.find((b) => !['completed', 'rejected', 'cancelled'].includes(b.status)) ?? bookings[0];

  return (
    <div className={'chats' + (cur ? ' has-thread' : '')}>
      <nav className="chatlist" aria-label="Диалоги">
        <div className="chatlist-h">Сообщения</div>
        {mine.length ? mine.map((c) => {
          const cl = s.listing(c.listingId)!;
          const amRenter = c.renterId === me;
          const who = s.user(amRenter ? cl.ownerId : c.renterId);
          const here = cur?.listingId === c.listingId && cur?.renterId === c.renterId;
          return (
            <Link key={`${c.listingId}-${c.renterId}`} to={`/chats/${c.listingId}/${c.renterId}`} className="chatrow" aria-current={here ? 'page' : undefined}>
              <span className="chatplate"><Plate art={cl.art} cat={cl.category} size="m" />{here ? <i className="here-dot" aria-hidden="true" /> : null}</span>
              <span style={{minWidth: 0}}>
                <span className="who">{who.name} · {amRenter ? 'владелец' : 'хочет взять'}</span>
                <b>{cl.title}</b>
                <small>{c.last ? `${(c.last.sender === 'renter') === amRenter ? 'Вы: ' : ''}${unlockedFor(s, c.listingId, c.renterId) ? c.last.body : maskContacts(c.last.body)}` : 'Нет сообщений'}</small>
              </span>
            </Link>
          );
        }) : <div className="chat-empty"><p>Диалогов пока нет. Напишите владельцу со страницы вещи.</p><Link className="btn btn-ink" to="/catalog">В каталог</Link></div>}
      </nav>

      <section className="thread" aria-label="Переписка">
        {!cur ? (
          <div className="chat-empty"><b style={{color: 'var(--ink)', fontSize: 18}}>Выберите диалог</b><p>Здесь появятся сообщения о ваших вещах и арендах.</p></div>
        ) : !allowed || !l || !other ? (
          <div className="chat-empty"><p>Этот диалог вам недоступен.</p></div>
        ) : (
          <>
            <div className="thread-h" data-line={l.category}>
              <button type="button" className="btn btn-ghost btn-s mobile-only" onClick={() => nav('/chats')} aria-label="К списку диалогов"><ArrowLeft size={18} /></button>
              <Plate art={l.art} cat={l.category} size="m" />
              <div style={{minWidth: 0}}>
                <Link to={`/listing/${l.id}`} style={{textDecoration: 'none'}}><b>{l.title}</b></Link>
                <small>{other.name} · {iAmRenter ? 'владелец' : 'арендатор'}{unlocked && other.username ? ` · Telegram @${other.username}` : ''}</small>
              </div>
              {active ? (
                nextAction(active, iAmRenter ? 'renter' : 'owner') ? (
                  <Link to={`/deal/${active.id}`} className="btn btn-go btn-s">{nextAction(active, iAmRenter ? 'renter' : 'owner')}</Link>
                ) : (
                  <Link to={`/deal/${active.id}`} className="dealchip"><i />{statusFor(active.status, iAmRenter ? 'renter' : 'owner')} →</Link>
                )
              ) : iAmRenter ? (
                <Link to={`/listing/${l.id}#book`} className="btn btn-go btn-s">Забронировать</Link>
              ) : null}
            </div>
            <div className="msgs" ref={box}>
              {!unlocked ? (
                <p className="masked"><EyeOff size={15} />Телефоны и ники скрыты, пока владелец не подтвердит бронь</p>
              ) : (
                <p className="msg-sys">Бронь подтверждена — контакты открыты. Telegram: @{other.username}</p>
              )}
              {msgs.map((m) => {
                const out = (m.sender === 'renter') === iAmRenter;
                return (
                  <div key={m.id} className={'msg' + (out ? ' mine' : '')}>
                    {unlocked ? m.body : maskContacts(m.body)}
                    <small>{dayShort(m.createdAt)}, {timeLabel(m.createdAt)}</small>
                  </div>
                );
              })}
            </div>
            <form className="compose" onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              act(() => s.send(l.id, cur.renterId, text));
              setText('');
            }}>
              <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" aria-label="Сообщение" />
              <button className="btn btn-ink" type="submit" disabled={!text.trim()} aria-label="Отправить"><Send size={18} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function unlockedFor(s: ReturnType<typeof useStore>, listingId: number, renterId: number) {
  return s.db.bookings.some((b) => b.listingId === listingId && b.renterId === renterId && [...BLOCKING, 'completed'].includes(b.status));
}
