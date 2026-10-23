// Состояние демо: база в localStorage, текущий пользователь, «часы» с перемоткой для проверки сделок.
import * as React from 'react';
import {
  BLOCKING, type Booking, type CategorySlug, type Chat, COMMISSION, type DB, DAY, type Listing, type Message, type Party, PROMO_DAYS,
  type SearchRequest, type User, district, metersBetween, priceFor, seed,
} from './data';

const KEY = 'useshare-v3';
const MAX_MESSAGE = 2000;
// id сообщения на стороне клиента: повторная отправка того же текста по плохой сети не создаёт дубль
const uuid = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
type Persist = {db: DB; me: number | null; shift: number; base: number};

function load(): Persist {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persist;
      if (p.db?.version === 3) return p;
    }
  } catch {
    /* приватный режим — начинаем с чистых данных */
  }
  const base = Date.now();
  return {db: seed(base), me: null, shift: 0, base};
}

export class ActionError extends Error {}

export interface Store {
  db: DB; now: number; me: User | null; shift: number;
  login(id: number): void; logout(): void; travel(days: number): void; reset(): void;
  user(id: number): User; listing(id: number): Listing | undefined;
  here(): {lat: number; lng: number; name: string};
  distanceTo(p: {lat: number; lng: number}): number;
  isFree(listingId: number, startsAt: number, endsAt: number, except?: number): boolean;
  saveListing(data: Omit<Listing, 'id' | 'ownerId' | 'createdAt' | 'status' | 'promotedUntil' | 'lat' | 'lng'>, id?: number): number;
  setListingStatus(id: number, status: Listing['status']): void;
  promote(id: number): void;
  createRequest(r: Omit<SearchRequest, 'id' | 'authorId' | 'createdAt' | 'closedAt' | 'lat' | 'lng'>): number;
  closeRequest(id: number): void;
  offer(requestId: number, listingId: number): number;
  openChat(listingId: number): number;
  send(chatId: number, body: string): void;
  markRead(chatId: number): void;
  requestBooking(listingId: number, startsAt: number, endsAt: number): number;
  decide(bookingId: number, ok: boolean): void;
  cancel(bookingId: number): void;
  pay(bookingId: number, idempotencyKey: string): void;
  handover(bookingId: number, photos: number): void;
  returned(bookingId: number, photos: number): void;
  block(userId: number, blocked: boolean): void;
}

const Ctx = React.createContext<Store>(null as unknown as Store);
export const useStore = () => React.useContext(Ctx);

export function StoreProvider({children}: {children: React.ReactNode}) {
  const [p, setP] = React.useState<Persist>(load);
  React.useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* не страшно */
    }
  }, [p]);
  // «сейчас» = реальное время + перемотка
  const [tick, setTick] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const now = tick + p.shift;

  const store = React.useMemo<Store>(() => {
    const db = p.db;
    const me = p.me ? db.users.find((u) => u.id === p.me) ?? null : null;
    const mutate = (fn: (d: DB) => void) =>
      setP((cur) => {
        const d: DB = structuredClone(cur.db);
        fn(d);
        return {...cur, db: d};
      });
    const next = (d: DB, k: string) => (d.seq[k] = (d.seq[k] ?? 0) + 1);
    const need = () => {
      if (!me) throw new ActionError('Войдите через Telegram, чтобы продолжить');
      if (me.isBlocked) throw new ActionError('Аккаунт заблокирован модератором');
      return me;
    };
    const free = (d: DB, listingId: number, a: number, b: number, except?: number) =>
      !d.bookings.some((x) => x.listingId === listingId && x.id !== except && BLOCKING.includes(x.status) && x.startsAt < b && a < x.endsAt);
    const booking = (d: DB, id: number) => {
      const b = d.bookings.find((x) => x.id === id);
      if (!b) throw new ActionError('Сделка не найдена');
      return b;
    };
    const ownerOf = (d: DB, b: Booking) => d.listings.find((l) => l.id === b.listingId)!.ownerId;
    // чат по паре «вещь + арендатор» — один; id известен до записи, чтобы вернуть его вызывающему
    const chatIdFor = (d: DB, listingId: number, renterId: number) => d.chats.find((c) => c.listingId === listingId && c.renterId === renterId)?.id;
    const ensureChat = (d: DB, listingId: number, renterId: number, searchRequestId: number | null = null) => {
      const found = chatIdFor(d, listingId, renterId);
      if (found) return found;
      const id = next(d, 'chats');
      d.chats.push({id, listingId, renterId, searchRequestId, createdAt: now});
      return id;
    };
    const newMessage = (d: DB, chatId: number, sender: Party, body: string): Message =>
      ({id: next(d, 'messages'), chatId, sender, body, clientMsgId: uuid(), createdAt: now, readAt: null});
    const here = () => {
      const d = district(me?.districtId ?? 1);
      return {lat: d.lat, lng: d.lng, name: d.name};
    };
    return {
      db, now, me, shift: p.shift,
      login: (id) => setP((c) => ({...c, me: id})),
      logout: () => setP((c) => ({...c, me: null})),
      travel: (days) => setP((c) => ({...c, shift: c.shift + days * DAY})),
      reset: () => {
        const base = Date.now();
        setP((c) => ({db: seed(base), me: c.me, shift: 0, base}));
      },
      user: (id) => db.users.find((u) => u.id === id)!,
      listing: (id) => db.listings.find((l) => l.id === id),
      here,
      distanceTo: (pt) => metersBetween(here(), pt),
      isFree: (lid, a, b, except) => free(db, lid, a, b, except),
      saveListing(data, id) {
        const u = need();
        const dist = district(data.districtId);
        const jitter = () => (Math.random() - 0.5) * 0.008;
        if (id && !db.listings.some((x) => x.id === id && x.ownerId === u.id)) throw new ActionError('Это не ваше объявление');
        const out = id ?? (db.seq.listings ?? 0) + 1;
        const pos = {lat: dist.lat + jitter(), lng: dist.lng + jitter()};
        mutate((d) => {
          if (id) {
            const l = d.listings.find((x) => x.id === id)!;
            const moved = l.districtId !== data.districtId;
            Object.assign(l, data, moved ? pos : {});
          } else {
            next(d, 'listings');
            d.listings.push({...data, id: out, ownerId: u.id, createdAt: now, status: 'active', promotedUntil: null, ...pos});
          }
        });
        return out;
      },
      setListingStatus(id, status) {
        const l = db.listings.find((x) => x.id === id)!;
        if (me?.role !== 'moderator' && l.ownerId !== me?.id) throw new ActionError('Нет прав');
        mutate((d) => {
          d.listings.find((x) => x.id === id)!.status = status;
        });
      },
      promote: (id) => mutate((d) => {
        const l = d.listings.find((x) => x.id === id)!;
        l.promotedUntil = Math.max(now, l.promotedUntil ?? 0) + PROMO_DAYS * DAY;
      }),
      createRequest(r) {
        const u = need();
        const dist = district(r.districtId);
        const id = (db.seq.requests ?? 0) + 1;
        mutate((d) => {
          next(d, 'requests');
          d.requests.push({...r, id, authorId: u.id, createdAt: now, closedAt: null, lat: dist.lat, lng: dist.lng});
        });
        return id;
      },
      closeRequest: (id) => mutate((d) => {
        const r = d.requests.find((x) => x.id === id)!;
        r.closedAt = now;
      }),
      offer(requestId, listingId) {
        const u = need();
        const r = db.requests.find((x) => x.id === requestId)!;
        const l = db.listings.find((x) => x.id === listingId)!;
        if (l.ownerId !== u.id) throw new ActionError('Предложить можно только своё объявление');
        if (r.authorId === u.id) throw new ActionError('Это ваш собственный запрос');
        const id = chatIdFor(db, listingId, r.authorId) ?? (db.seq.chats ?? 0) + 1;
        mutate((d) => {
          const cid = ensureChat(d, listingId, r.authorId, r.id);
          const c = d.chats.find((x) => x.id === cid)!;
          if (c.searchRequestId === null) c.searchRequestId = r.id; // отклик в уже существующий чат по этой вещи
          d.messages.push(newMessage(d, cid, 'owner', `Видел ваш запрос «${r.description}». У меня есть «${l.title}» — подойдёт?`));
        });
        return id;
      },
      openChat(listingId) {
        const u = need();
        const l = db.listings.find((x) => x.id === listingId)!;
        if (l.ownerId === u.id) throw new ActionError('Это ваше объявление');
        const id = chatIdFor(db, listingId, u.id) ?? (db.seq.chats ?? 0) + 1;
        mutate((d) => {
          ensureChat(d, listingId, u.id);
        });
        return id;
      },
      send(chatId, body) {
        const u = need();
        const text = body.trim();
        if (!text) return;
        if (text.length > MAX_MESSAGE) throw new ActionError(`Сообщение длиннее ${MAX_MESSAGE} знаков`);
        const c = db.chats.find((x) => x.id === chatId);
        if (!c) throw new ActionError('Чат не найден');
        const sender = chatParty(db, c, u.id);
        if (!sender) throw new ActionError('Вы не участник этого чата');
        mutate((d) => {
          d.messages.push(newMessage(d, chatId, sender, text));
        });
      },
      markRead(chatId) {
        if (!me) return;
        const c = db.chats.find((x) => x.id === chatId);
        if (!c) return;
        const mine = chatParty(db, c, me.id);
        if (!mine || !unreadIn(db, c, me.id)) return;
        mutate((d) => {
          for (const m of d.messages) if (m.chatId === chatId && m.sender !== mine && m.readAt === null) m.readAt = now;
        });
      },
      requestBooking(listingId, a, b) {
        const u = need();
        const l = db.listings.find((x) => x.id === listingId)!;
        if (l.ownerId === u.id) throw new ActionError('Нельзя забронировать свою вещь');
        if (b <= a) throw new ActionError('Конец аренды должен быть позже начала');
        if (a < now - 60 * 60e3) throw new ActionError('Начало аренды уже прошло');
        if (!free(db, listingId, a, b)) throw new ActionError('Эти даты уже заняты подтверждённой бронью');
        const pr = priceFor(l, a, b);
        const id = (db.seq.bookings ?? 0) + 1;
        mutate((d) => {
          next(d, 'bookings');
          d.bookings.push({id, renterId: u.id, listingId, startsAt: a, endsAt: b, status: 'requested', rentAmount: pr.rent,
            commissionAmount: Math.round(pr.rent * COMMISSION), depositAmount: l.deposit, handoverPhotos: 0, returnPhotos: 0, createdAt: now, completedAt: null});
          ensureChat(d, listingId, u.id);
        });
        return id;
      },
      decide(id, ok) {
        const u = need();
        const b = booking(db, id);
        if (ownerOf(db, b) !== u.id) throw new ActionError('Решение принимает владелец');
        if (b.status !== 'requested') throw new ActionError('Запрос уже обработан');
        if (ok && !free(db, b.listingId, b.startsAt, b.endsAt, b.id)) throw new ActionError('На эти даты уже есть подтверждённая бронь');
        mutate((d) => {
          booking(d, id).status = ok ? 'confirmed' : 'rejected';
        });
      },
      cancel(id) {
        const u = need();
        const b = booking(db, id);
        if (b.renterId !== u.id && ownerOf(db, b) !== u.id) throw new ActionError('Нет прав');
        if (!['requested', 'confirmed'].includes(b.status)) throw new ActionError('После оплаты бронь не отменить');
        mutate((d) => {
          booking(d, id).status = 'cancelled';
        });
      },
      pay(id, key) {
        const u = need();
        const b0 = booking(db, id);
        if (b0.renterId !== u.id) throw new ActionError('Оплачивает арендатор');
        if (db.payments.some((x) => x.idempotencyKey === `${key}-rent`)) return;
        if (b0.status !== 'confirmed') throw new ActionError('Оплатить можно только подтверждённую бронь');
        mutate((d) => {
          // повторное нажатие с тем же ключом не создаёт второе списание (NFR-02)
          if (d.payments.some((x) => x.idempotencyKey === `${key}-rent`)) return;
          const b = booking(d, id);
          const mk = (kind: 'rent' | 'deposit_hold', amount: number) =>
            d.payments.push({id: next(d, 'payments'), bookingId: b.id, kind, amount, status: 'succeeded', providerPaymentId: `sbx_${200000 + (d.seq.payments ?? 0)}`, idempotencyKey: `${key}-${kind}`, createdAt: now});
          mk('rent', b.rentAmount + b.commissionAmount);
          mk('deposit_hold', b.depositAmount);
          b.status = 'paid';
        });
      },
      handover(id, photos) {
        const u = need();
        const b = booking(db, id);
        if (ownerOf(db, b) !== u.id) throw new ActionError('Передачу отмечает владелец');
        if (b.status !== 'paid') throw new ActionError('Сначала арендатор оплачивает аренду и залог');
        mutate((d) => {
          Object.assign(booking(d, id), {status: 'handed_over', handoverPhotos: photos});
        });
      },
      returned(id, photos) {
        const u = need();
        const b0 = booking(db, id);
        if (ownerOf(db, b0) !== u.id) throw new ActionError('Возврат подтверждает владелец');
        if (b0.status !== 'handed_over') throw new ActionError('Вещь ещё не передана');
        mutate((d) => {
          const b = booking(d, id);
          Object.assign(b, {status: 'completed', returnPhotos: photos, completedAt: now});
          const mk = (kind: 'deposit_release' | 'payout', amount: number) =>
            d.payments.push({id: next(d, 'payments'), bookingId: b.id, kind, amount, status: 'succeeded', providerPaymentId: `sbx_${200000 + (d.seq.payments ?? 0)}`, idempotencyKey: `b${b.id}-${kind}`, createdAt: now});
          mk('deposit_release', b.depositAmount);
          mk('payout', b.rentAmount);
        });
      },
      block(userId, blocked) {
        if (me?.role !== 'moderator') throw new ActionError('Только для модератора');
        mutate((d) => {
          d.users.find((x) => x.id === userId)!.isBlocked = blocked;
        });
      },
    };
  }, [p, now]);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

// ── выборки ──
export const ownerOfListing = (db: DB, listingId: number) => db.listings.find((l) => l.id === listingId)!.ownerId;
export const isPromoted = (l: Listing, now: number) => !!l.promotedUntil && l.promotedUntil > now;
export function busyNow(db: DB, listingId: number, now: number) {
  return db.bookings.find((b) => b.listingId === listingId && ['paid', 'handed_over'].includes(b.status) && b.startsAt <= now && now < b.endsAt);
}
// моя сторона в чате: арендатор, владелец вещи или никто
export const chatParty = (db: DB, c: Chat, userId: number): Party | null =>
  c.renterId === userId ? 'renter' : ownerOfListing(db, c.listingId) === userId ? 'owner' : null;
export const myChats = (db: DB, userId: number) => db.chats.filter((c) => chatParty(db, c, userId) !== null);
// непрочитанные мной: написала другая сторона, readAt ещё пуст
export function unreadIn(db: DB, c: Chat, userId: number) {
  const mine = chatParty(db, c, userId);
  return mine ? db.messages.filter((m) => m.chatId === c.id && m.sender !== mine && m.readAt === null).length : 0;
}
export type CategoryFilter = CategorySlug | 'all';
