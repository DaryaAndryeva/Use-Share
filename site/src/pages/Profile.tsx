import {Link, useParams} from 'react-router-dom';
import {district, plural} from '../data';
import {useStore} from '../store';
import {Ava, Empty, ItemCard} from '../ui';

export function Profile() {
  const {id} = useParams();
  const s = useStore();
  const u = s.db.users.find((x) => x.id === Number(id));
  if (!u) return <Empty title="Пользователь не найден" action={<Link className="btn btn-ink" to="/catalog">В каталог</Link>} />;
  const items = s.db.listings.filter((l) => l.ownerId === u.id && l.status === 'active');
  const done = s.db.bookings.filter((b) => b.status === 'completed' && s.listing(b.listingId)!.ownerId === u.id).length;
  return (
    <>
      <div className="profile-h">
        <Ava name={u.name} />
        <div>
          <h1 style={{fontSize: 34, fontWeight: 800}}>{u.name}</h1>
          <p className="muted">{district(u.districtId).name} · на сервисе с {new Date(u.createdAt).getFullYear()} · {done} {plural(done, 'завершённая аренда', 'завершённые аренды', 'завершённых аренд')}</p>
          {u.isBlocked ? <span className="tag tag-off" style={{marginTop: 8}}>Заблокирован модератором</span> : <span className="tag tag-go" style={{marginTop: 8}}>Вход через Telegram подтверждён</span>}
        </div>
      </div>
      <div className="section-h"><h2 style={{fontSize: 24}}>Сдаёт</h2></div>
      {items.length ? <div className="items">{items.map((l) => <ItemCard key={l.id} l={l} />)}</div> : <Empty title="Сейчас ничего не сдаёт" />}
    </>
  );
}
