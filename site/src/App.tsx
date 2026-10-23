import {Home as HomeIcon, MessageCircle, Plus, Search, User} from 'lucide-react';
import * as React from 'react';
import {HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import {Logo} from './art';
import {Admin, Analytics} from './pages/Admin';
import {Cabinet} from './pages/Cabinet';
import {Catalog} from './pages/Catalog';
import {Chats} from './pages/Chats';
import {Deal} from './pages/Deal';
import {Home} from './pages/Home';
import {ListingPage} from './pages/Listing';
import {Login} from './pages/Login';
import {NewListing} from './pages/NewListing';
import {NewRequest, Requests} from './pages/Requests';
import {Profile} from './pages/Profile';
import {StoreProvider, myChats, ownerOfListing, unreadIn, useStore} from './store';
import {ToastHost} from './ui';

/** Сколько дел ждёт меня: запросы брони на мои вещи и диалоги с непрочитанными сообщениями. */
export function useInbox() {
  const s = useStore();
  if (!s.me) return {bookings: 0, chats: 0};
  const me = s.me.id;
  const bookings = s.db.bookings.filter((b) => b.status === 'requested' && ownerOfListing(s.db, b.listingId) === me).length;
  const chats = myChats(s.db, me).filter((c) => unreadIn(s.db, c, me) > 0).length;
  return {bookings, chats};
}

function Header() {
  const s = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const inbox = useInbox();
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    const p = new URLSearchParams(loc.search);
    setQ(loc.pathname === '/catalog' ? p.get('q') ?? '' : '');
  }, [loc]);
  return (
    <header className="header">
      <div className="header-in">
        <Link to="/" className="brand" aria-label="Use & Share — на главную">
          <Logo />
          <span>Use <b>&amp;</b> Share</span>
        </Link>
        <form className="hsearch" role="search" onSubmit={(e) => {
          e.preventDefault();
          nav(`/catalog${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
        }}>
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Дрель, палатка, проектор…" aria-label="Что ищете" />
        </form>
        <nav className="nav" aria-label="Основное меню">
          <NavLink to="/catalog">Каталог</NavLink>
          <NavLink to="/requests">Люди ищут</NavLink>
          {s.me ? (
            <>
              <NavLink to="/chats">Сообщения{inbox.chats ? <span className="count">{inbox.chats}</span> : null}</NavLink>
              <NavLink to="/me">Кабинет{inbox.bookings ? <span className="count">{inbox.bookings}</span> : null}</NavLink>
              {s.me.role === 'moderator' ? <NavLink to="/admin">Модерация</NavLink> : null}
            </>
          ) : (
            <NavLink to="/login">Войти</NavLink>
          )}
          <Link to="/new" className="btn btn-go" style={{color: '#fff', marginLeft: 8}}>
            <Plus size={18} />
            Сдать вещь
          </Link>
        </nav>
      </div>
    </header>
  );
}

function TabBar() {
  const s = useStore();
  const inbox = useInbox();
  return (
    <nav className="tabbar" aria-label="Нижнее меню">
      <NavLink to="/" end><HomeIcon size={22} />Главная</NavLink>
      <NavLink to="/catalog"><Search size={22} />Каталог</NavLink>
      <NavLink to="/new" aria-label="Сдать вещь"><span className="plus"><Plus size={24} /></span></NavLink>
      <NavLink to="/chats"><MessageCircle size={22} />Чаты{inbox.chats ? <span className="count">{inbox.chats}</span> : null}</NavLink>
      <NavLink to={s.me ? '/me' : '/login'}><User size={22} />{s.me ? 'Кабинет' : 'Войти'}{inbox.bookings ? <span className="count">{inbox.bookings}</span> : null}</NavLink>
    </nav>
  );
}

function Footer() {
  const s = useStore();
  return (
    <footer className="footer">
      <div className="footer-in">
        <div>
          <Link to="/" className="brand"><Logo /><span>Use <b>&amp;</b> Share</span></Link>
          <p>Аренда вещей у соседей в Москве. Оплата и залог — через сервис, контакты открываются после брони.</p>
        </div>
        <div>
          <b>Арендатору</b>
          <Link to="/catalog">Каталог вещей</Link>
          <Link to="/request/new">Оставить «ищу»</Link>
          <Link to="/me/rentals">Мои аренды</Link>
        </div>
        <div>
          <b>Владельцу</b>
          <Link to="/new">Сдать вещь</Link>
          <Link to="/requests">Что ищут соседи</Link>
          <Link to="/me/listings">Мои вещи</Link>
        </div>
        <div>
          <b>Команде</b>
          <Link to="/analytics">Метрики</Link>
          <a href="/erd.html">Схема базы данных</a>
          <a href="mailto:hello@use-share.ru">hello@use-share.ru</a>
        </div>
      </div>
      <div className="demo">
        <div className="demo-in">
          <span>Демо-версия: данные синтетические и хранятся в вашем браузере. Время:</span>
          <b className="num" style={{color: '#fff'}}>{new Date(s.now).toLocaleString('ru-RU', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'})}</b>
          <button type="button" onClick={() => s.travel(1)}>+1 день</button>
          <button type="button" onClick={() => s.travel(7)}>+7 дней</button>
          <button type="button" onClick={() => confirm('Вернуть демо-данные к началу? Ваши объявления, чаты и брони пропадут.') && s.reset()}>Сбросить данные</button>
        </div>
      </div>
    </footer>
  );
}

function ScrollTop() {
  const {pathname} = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const {pathname} = useLocation();
  const flush = pathname === '/';
  React.useEffect(() => {
    const titles: [RegExp, string][] = [[/^\/catalog/, 'Каталог'], [/^\/listing/, 'Вещь'], [/^\/new|^\/edit/, 'Сдать вещь'], [/^\/requests|^\/request/, 'Люди ищут'],
      [/^\/chats/, 'Сообщения'], [/^\/deal/, 'Сделка'], [/^\/me/, 'Кабинет'], [/^\/admin/, 'Модерация'], [/^\/analytics/, 'Метрики'], [/^\/login/, 'Вход']];
    const t = titles.find(([r]) => r.test(pathname))?.[1];
    document.title = t ? `${t} — Use & Share` : 'Use & Share — вещи у соседей';
  }, [pathname]);
  return (
    <div className="app">
      <ScrollTop />
      <Header />
      <main className={'main' + (flush ? ' flush' : '')} id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/listing/:id" element={<ListingPage />} />
          <Route path="/new" element={<NewListing />} />
          <Route path="/edit/:id" element={<NewListing />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/request/new" element={<NewRequest />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/chats/:chatId" element={<Chats />} />
          <Route path="/deal/:id" element={<Deal />} />
          <Route path="/me" element={<Navigate to="/me/overview" replace />} />
          <Route path="/me/:tab" element={<Cabinet />} />
          <Route path="/user/:id" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<div className="empty"><h3>Такой страницы нет</h3><p>Возможно, ссылка устарела.</p><Link className="btn btn-ink" to="/">На главную</Link></div>} />
        </Routes>
      </main>
      <Footer />
      <TabBar />
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <ToastHost>
        <HashRouter>
          <Shell />
        </HashRouter>
      </ToastHost>
    </StoreProvider>
  );
}
