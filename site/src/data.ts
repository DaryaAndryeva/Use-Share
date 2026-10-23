// Демо-данные и модель по schema.sql v3. Сервера нет: всё хранится в браузере.

export type CategorySlug = 'tools' | 'tourism' | 'photo' | 'kids' | 'sport' | 'party' | 'kitchen';
export type BookingStatus = 'requested' | 'rejected' | 'cancelled' | 'confirmed' | 'paid' | 'handed_over' | 'completed';
export type Party = 'renter' | 'owner';
export type PaymentKind = 'rent' | 'deposit_hold' | 'deposit_release' | 'payout';

export interface District { id: number; name: string; lat: number; lng: number }
export interface User {
  id: number; telegramId: number; username: string; name: string; districtId: number;
  role: 'user' | 'moderator'; isBlocked: boolean; pdnConsentAt: number; createdAt: number;
}
export interface Listing {
  id: number; ownerId: number; category: CategorySlug; art: string; title: string; description: string; kit: string[];
  priceHour: number | null; priceDay: number | null; deposit: number; districtId: number; lat: number; lng: number;
  photos: number; status: 'active' | 'hidden' | 'archived'; promotedUntil: number | null; createdAt: number;
}
// Чат — один на пару «вещь + арендатор»; если в нём был отклик на запрос «ищу», помним, на какой
export interface Chat { id: number; listingId: number; renterId: number; searchRequestId: number | null; createdAt: number }
// Читает всегда другая сторона, поэтому отметка о прочтении одна; clientMsgId — защита от дублей при повторной отправке
export interface Message { id: number; chatId: number; sender: Party; body: string; clientMsgId: string; createdAt: number; readAt: number | null }
export interface Booking {
  id: number; renterId: number; listingId: number; startsAt: number; endsAt: number; status: BookingStatus;
  rentAmount: number; commissionAmount: number; depositAmount: number; handoverPhotos: number; returnPhotos: number;
  createdAt: number; completedAt: number | null;
}
export interface Payment {
  id: number; bookingId: number; kind: PaymentKind; amount: number; status: 'pending' | 'succeeded' | 'failed';
  providerPaymentId: string; idempotencyKey: string; createdAt: number;
}
export interface SearchRequest {
  id: number; authorId: number; category: CategorySlug; description: string; startsAt: number; endsAt: number;
  maxPrice: number | null; districtId: number; lat: number; lng: number; createdAt: number; closedAt: number | null;
}
export interface DB {
  version: 3; users: User[]; listings: Listing[]; chats: Chat[]; messages: Message[]; bookings: Booking[];
  payments: Payment[]; requests: SearchRequest[]; seq: Record<string, number>;
}

export const HOUR = 36e5, DAY = 864e5;
export const COMMISSION = 0.1, PROMO_PRICE = 149, PROMO_DAYS = 7;

export const DISTRICTS: District[] = [
  {id: 1, name: 'Хамовники', lat: 55.729, lng: 37.577}, {id: 2, name: 'Лужники', lat: 55.716, lng: 37.554},
  {id: 3, name: 'Арбат', lat: 55.752, lng: 37.592}, {id: 4, name: 'Пресня', lat: 55.76, lng: 37.56},
  {id: 5, name: 'Якиманка', lat: 55.734, lng: 37.61}, {id: 6, name: 'Дорогомилово', lat: 55.741, lng: 37.533},
  {id: 7, name: 'Замоскворечье', lat: 55.735, lng: 37.63}, {id: 8, name: 'Тверской', lat: 55.768, lng: 37.605},
  {id: 9, name: 'Раменки', lat: 55.697, lng: 37.5}, {id: 10, name: 'Сокольники', lat: 55.793, lng: 37.68},
];

export const CATEGORIES: {slug: CategorySlug; name: string; short: string; line: number}[] = [
  {slug: 'tools', name: 'Инструменты', short: 'Инструменты', line: 1},
  {slug: 'tourism', name: 'Туризм и кемпинг', short: 'Туризм', line: 2},
  {slug: 'photo', name: 'Фото и видео', short: 'Фото', line: 3},
  {slug: 'kids', name: 'Детское', short: 'Детское', line: 4},
  {slug: 'sport', name: 'Спорт и самокаты', short: 'Спорт', line: 5},
  {slug: 'party', name: 'Праздники', short: 'Праздники', line: 6},
  {slug: 'kitchen', name: 'Кухня и техника', short: 'Кухня', line: 7},
];
export const category = (slug: CategorySlug) => CATEGORIES.find((c) => c.slug === slug)!;
export const district = (id: number) => DISTRICTS.find((d) => d.id === id)!;

const PEOPLE: [string, string, number, 'user' | 'moderator', number][] = [
  ['ivan_petrov', 'Иван Петров', 1, 'user', 2022], ['m_kozlov', 'Михаил Козлов', 1, 'user', 2021],
  ['anna_sm', 'Анна Смирнова', 2, 'user', 2023], ['oleg_belov', 'Олег Белов', 3, 'user', 2023],
  ['lev_k', 'Лев Кузнецов', 5, 'user', 2024], ['marina_orl', 'Марина Орлова', 2, 'user', 2025],
  ['elena_n', 'Елена Новикова', 4, 'user', 2025], ['roman_m', 'Роман Миронов', 3, 'user', 2024],
  ['antonk', 'Антон Ковалёв', 6, 'user', 2025], ['useshare_mod', 'Дарья Андреева', 1, 'moderator', 2025],
];

// владелец, категория, район, пиктограмма, название, цена/час, цена/сутки, залог, описание, комплект, сдвиг координат
const THINGS: [number, CategorySlug, number, string, string, number | null, number, number, string, string[], number, number][] = [
  [2, 'tools', 1, 'drill', 'Аккумуляторная дрель Bosch', 60, 250, 3000, 'Лёгкая ударная дрель для сборки мебели и домашнего ремонта. Два аккумулятора, зарядное устройство и набор свёрл входят в комплект.', ['Дрель Bosch GSB 18V-50', '2 аккумулятора и зарядное устройство', 'Набор из 24 свёрл и бит', 'Кейс для переноски'], 0.003, 0.004],
  [2, 'tools', 1, 'perforator', 'Перфоратор Makita HR2470', 90, 300, 4000, 'Надёжный перфоратор SDS-plus: сверление бетона, долбление плитки. Подойдёт для ремонта в квартире.', ['Перфоратор Makita', 'Набор буров 6–12 мм', 'Пика и зубило', 'Кейс'], 0.006, -0.008],
  [2, 'tools', 1, 'toolcase', 'Набор ручного инструмента', null, 180, 1500, '108 предметов: ключи, головки, отвёртки, пассатижи. Всё, что нужно для мелкого ремонта.', ['Кейс на 108 предметов', 'Трещотка 1/4 и 1/2'], -0.002, 0.006],
  [1, 'tools', 1, 'ladder', 'Стремянка, 5 ступеней', null, 180, 1500, 'Алюминиевая стремянка высотой 1,7 м. Лёгкая, устойчивая, с полочкой для инструмента.', ['Стремянка Sarayli 5 ступеней'], 0.001, -0.002],
  [1, 'tourism', 1, 'tent', 'Палатка Quechua на троих', null, 400, 3000, 'Трёхместная палатка с быстрой установкой за 2 минуты. Водостойкость 2000 мм, есть тамбур.', ['Палатка Quechua MH100', 'Колышки и оттяжки', 'Чехол'], -0.004, -0.006],
  [5, 'tourism', 5, 'sup', 'SUP-доска надувная', 250, 1200, 6000, 'Надувная SUP-доска 320 см, выдерживает до 120 кг. В комплекте весло, насос и рюкзак.', ['Доска 320 см', 'Весло', 'Насос', 'Рюкзак'], 0.002, 0.003],
  [1, 'photo', 1, 'projector', 'Проектор Epson для дома', 150, 700, 7000, 'Full HD проектор, 3200 люмен. Отлично для домашнего кино и презентаций. Есть HDMI-кабель 5 м.', ['Проектор Epson EH-TW740', 'HDMI-кабель 5 м', 'Пульт'], 0.005, 0.009],
  [3, 'photo', 2, 'camera', 'Фотоаппарат Canon EOS 250D', 200, 900, 10000, 'Зеркальная камера с объективом 18–55 мм. Подойдёт для путешествий и семейных праздников.', ['Canon EOS 250D', 'Объектив 18–55', 'Карта памяти 64 ГБ', 'Сумка'], 0.001, 0.002],
  [3, 'photo', 2, 'lens', 'Объектив Canon 50 mm f/1.8', null, 350, 3000, 'Светосильный портретный объектив. Красивое размытие фона.', ['Объектив Canon EF 50mm f/1.8 STM', 'Бленда'], -0.003, 0.004],
  [3, 'kids', 2, 'stroller', 'Прогулочная коляска Yoyo', null, 300, 5000, 'Компактная прогулочная коляска, складывается одной рукой, помещается в ручную кладь.', ['Коляска', 'Дождевик', 'Москитная сетка'], 0.004, -0.004],
  [5, 'sport', 5, 'bike', 'Городской велосипед Giant', 120, 550, 5000, 'Городской велосипед на 7 скоростей, рама M. Есть замок и фонари.', ['Велосипед Giant Escape', 'Замок', 'Фонари'], -0.002, -0.003],
  [5, 'sport', 5, 'scooter', 'Электросамокат Xiaomi', 150, 700, 8000, 'Запас хода 30 км, максимальная скорость 25 км/ч. Зарядка в комплекте.', ['Самокат Xiaomi Mi 3', 'Зарядное устройство'], 0.006, 0.001],
  [4, 'party', 3, 'speaker', 'Колонка JBL PartyBox 310', 300, 1500, 8000, 'Мощная колонка с подсветкой для праздника на 30 человек. Работает 18 часов от аккумулятора.', ['Колонка JBL PartyBox 310', 'Микрофон', 'Кабель питания'], 0.002, -0.003],
  [4, 'party', 3, 'picnic', 'Набор для пикника на 6 персон', null, 320, 1500, 'Корзина с посудой, пледом и термосумкой. Всё в одном месте.', ['Корзина', 'Посуда на 6 персон', 'Плед', 'Термосумка'], -0.004, 0.002],
  [4, 'kitchen', 3, 'vacuum', 'Моющий пылесос Kärcher', null, 600, 5000, 'Моющий пылесос для химчистки диванов, ковров и салона автомобиля. Средство в подарок.', ['Пылесос Kärcher SE 4001', 'Насадки', 'Средство для чистки'], 0.003, 0.005],
  [5, 'tourism', 1, 'tent', 'Палатка Outventure двухместная', null, 350, 2500, 'Лёгкая двухместная палатка 2,1 кг — для походов выходного дня. Ставится за 5 минут.', ['Палатка Outventure Teslin 2', 'Коврик под палатку', 'Ремкомплект'], 0.005, 0.002],
  [6, 'kitchen', 2, 'mixer', 'Планетарный миксер Kitfort', null, 350, 4000, 'Планетарный миксер с чашей 5 л для выпечки и крема. Три насадки.', ['Миксер Kitfort', 'Чаша 5 л', '3 насадки'], 0.002, 0.006],
];

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const at = (now: number, days: number, hour: number) => {
  const d = new Date(now + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

export function priceFor(l: Pick<Listing, 'priceHour' | 'priceDay'>, startsAt: number, endsAt: number) {
  const hours = Math.max(1, Math.ceil((endsAt - startsAt) / HOUR));
  if (l.priceHour && hours < 24 && (!l.priceDay || hours * l.priceHour < l.priceDay)) {
    return {unit: 'hour' as const, units: hours, unitPrice: l.priceHour, rent: hours * l.priceHour};
  }
  const days = Math.max(1, Math.ceil(hours / 24));
  const unitPrice = l.priceDay ?? l.priceHour! * 24;
  return {unit: 'day' as const, units: days, unitPrice, rent: days * unitPrice};
}

export function seed(now: number): DB {
  const r = rng(42);
  const seq: Record<string, number> = {};
  const next = (k: string) => (seq[k] = (seq[k] ?? 0) + 1);
  const users: User[] = PEOPLE.map(([username, name, districtId, role, since], i) => ({
    id: next('users'), telegramId: 100001 + i, username, name, districtId, role, isBlocked: false,
    pdnConsentAt: new Date(`${since}-03-01`).getTime(), createdAt: new Date(`${since}-03-01`).getTime(),
  }));
  const listings: Listing[] = THINGS.map(([ownerId, cat, districtId, art, title, priceHour, priceDay, deposit, description, kit, dLat, dLng], i) => {
    const d = district(districtId);
    return {
      id: next('listings'), ownerId, category: cat, art, title, description, kit, priceHour, priceDay, deposit, districtId,
      lat: +(d.lat + dLat).toFixed(6), lng: +(d.lng + dLng).toFixed(6), photos: 1 + (i % 4), status: 'active',
      promotedUntil: null, createdAt: now - (40 + i * 9) * DAY,
    };
  });
  listings[5].promotedUntil = now + 5 * DAY; // SUP продвигается
  const chats: Chat[] = [], messages: Message[] = [], bookings: Booking[] = [], payments: Payment[] = [];
  // readAt: история прочитана; null — другая сторона ещё не открывала чат
  const msg = (chatId: number, sender: Party, body: string, createdAt: number, readAt: number | null = createdAt + 5 * 60e3) => {
    const id = next('messages');
    messages.push({id, chatId, sender, body, clientMsgId: `seed-${id}`, createdAt, readAt});
  };
  const chat = (listingId: number, renterId: number, createdAt: number) => {
    const c = chats.find((x) => x.listingId === listingId && x.renterId === renterId);
    if (c) return c.id;
    const id = next('chats');
    chats.push({id, listingId, renterId, searchRequestId: null, createdAt});
    return id;
  };
  const pay = (bookingId: number, kind: PaymentKind, amount: number, createdAt: number) =>
    payments.push({id: next('payments'), bookingId, kind, amount, status: 'succeeded', providerPaymentId: `sbx_${100000 + (seq.payments ?? 0) + 1}`, idempotencyKey: `seed-${bookingId}-${kind}`, createdAt});
  const book = (l: Listing, renterId: number, startsAt: number, endsAt: number, status: BookingStatus, createdAt: number) => {
    const p = priceFor(l, startsAt, endsAt);
    const b: Booking = {
      id: next('bookings'), renterId, listingId: l.id, startsAt, endsAt, status, rentAmount: p.rent,
      commissionAmount: Math.round(p.rent * COMMISSION), depositAmount: l.deposit, handoverPhotos: 0, returnPhotos: 0, createdAt,
      completedAt: null,
    };
    bookings.push(b);
    if (['paid', 'handed_over', 'completed'].includes(status)) {
      pay(b.id, 'rent', b.rentAmount + b.commissionAmount, createdAt + 2 * HOUR);
      pay(b.id, 'deposit_hold', b.depositAmount, createdAt + 2 * HOUR);
    }
    if (['handed_over', 'completed'].includes(status)) b.handoverPhotos = 2;
    if (status === 'completed') {
      b.returnPhotos = 2;
      b.completedAt = endsAt + HOUR;
      pay(b.id, 'deposit_release', b.depositAmount, b.completedAt);
      pay(b.id, 'payout', b.rentAmount, b.completedAt);
    }
    return b;
  };
  // история: завершённые аренды за последние месяцы
  const renters = [3, 4, 5, 6, 7, 8, 9, 1, 2];
  for (const l of listings) {
    const n = l.ownerId === 6 ? 1 : 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const renterId = renters.filter((u) => u !== l.ownerId)[Math.floor(r() * 8)];
      const start = at(now, -Math.floor(6 + r() * 100), 10);
      const days = 1 + Math.floor(r() * 3);
      const cid = chat(l.id, renterId, start - 2 * DAY);
      msg(cid, 'renter', `Здравствуйте! Можно взять «${l.title}» на ${days} ${days === 1 ? 'день' : 'дня'}?`, start - 2 * DAY);
      msg(cid, 'owner', 'Да, свободно. Оформляйте бронь.', start - 2 * DAY + 10 * 60e3);
      book(l, renterId, start, start + days * DAY, 'completed', start - 2 * DAY + HOUR);
    }
  }
  // текущие сделки демо-пользователей
  const L = (id: number) => listings[id - 1];
  const live: [number, number, number, number, number, number, BookingStatus][] = [
    // вещь, арендатор, день начала, час, длительность (часы), создано дней назад, статус
    [5, 6, 1, 10, 72, 1, 'paid'],          // Марина берёт палатку на выходные
    [1, 6, 3, 12, 3, 0, 'requested'],      // Марина просит дрель на 3 часа
    [17, 3, 0, 18, 48, 2, 'handed_over'],  // у Марины взяли миксер
    [17, 7, 4, 10, 24, 0, 'requested'],    // Елена просит миксер
    [2, 8, 2, 11, 6, 1, 'confirmed'],      // Роман берёт перфоратор
    [11, 9, -1, 9, 96, 3, 'handed_over'],  // Антон катается на велосипеде
  ];
  for (const [lid, renterId, day, hour, hours, ago, status] of live) {
    const l = L(lid), start = at(now, day, hour);
    const cid = chat(l.id, renterId, now - (ago + 1) * DAY);
    msg(cid, 'renter', `Добрый день! «${l.title}» свободна ${new Date(start).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'})}? Мой телефон +7 916 123-45-67`, now - (ago + 1) * DAY);
    msg(cid, 'owner', 'Здравствуйте, да. Встретимся у метро, удобно?', now - (ago + 1) * DAY + 25 * 60e3, null); // арендатор ещё не прочитал
    book(l, renterId, start, start + hours * HOUR, status, now - ago * DAY - 3 * HOUR);
  }
  const requests: SearchRequest[] = [
    [7, 'kitchen' as CategorySlug, 4, 'Пароочиститель для уборки после ремонта', 1, 3, 900],
    [8, 'party' as CategorySlug, 3, 'Складной стол на 8 человек', 4, 7, 1200],
    [9, 'photo' as CategorySlug, 6, 'Штатив для видеосъёмки', 1, 2, 400],
    [6, 'tourism' as CategorySlug, 2, 'Горелка и котелок для похода', 1, 4, 300],
  ].map(([authorId, cat, districtId, description, from, to, maxPrice]) => {
    const d = district(districtId as number);
    return {
      id: next('requests'), authorId: authorId as number, category: cat as CategorySlug, description: description as string,
      startsAt: at(now, from as number, 10), endsAt: at(now, to as number, 20), maxPrice: maxPrice as number,
      districtId: d.id, lat: d.lat, lng: d.lng, createdAt: now - DAY, closedAt: null,
    };
  });
  return {version: 3, users, listings, chats, messages, bookings, payments, requests, seq};
}

// ── геометрия «линии пути» ──
export function metersBetween(a: {lat: number; lng: number}, b: {lat: number; lng: number}) {
  const R = 6371e3, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
export const walkMinutes = (m: number) => Math.max(1, Math.round(m / 75));
export function distanceText(m: number) {
  if (m <= 2000) return `${walkMinutes(m)} мин пешком`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} км`;
}
export const meters = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} м` : `${(m / 1000).toFixed(1).replace('.', ',')} км`);

// ── форматирование ──
export const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
export const dayLabel = (t: number) => new Date(t).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'});
export const dayShort = (t: number) => new Date(t).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'}).replace('.', '');
export const timeLabel = (t: number) => new Date(t).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
export function periodLabel(a: number, b: number) {
  const sameDay = new Date(a).toDateString() === new Date(b).toDateString();
  if (sameDay) return `${dayLabel(a)}, ${timeLabel(a)}–${timeLabel(b)}`;
  return `${dayLabel(a)} ${timeLabel(a)} — ${dayLabel(b)} ${timeLabel(b)}`;
}
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const priceLine = (l: Pick<Listing, 'priceHour' | 'priceDay'>) =>
  l.priceDay ? `${rub(l.priceDay)} / сутки` : `${rub(l.priceHour!)} / час`;

// маскировка контактов в чате до подтверждения брони (FR-05)
export function maskContacts(text: string) {
  return text
    .replace(/(\+?\d[\d\s\-()]{8,}\d)/g, (m) => m.replace(/\d(?=[\d\s\-()]*\d{2})/g, '•'))
    .replace(/@[a-z0-9_]{3,}/gi, '@•••••')
    .replace(/(t\.me\/)[a-z0-9_]+/gi, '$1•••••');
}

export const STATUS: Record<BookingStatus, {label: string; tone: 'wait' | 'go' | 'done' | 'off'}> = {
  requested: {label: 'Ждёт ответа владельца', tone: 'wait'},
  confirmed: {label: 'Подтверждена, ждёт оплаты', tone: 'go'},
  paid: {label: 'Оплачена', tone: 'go'},
  handed_over: {label: 'Вещь у арендатора', tone: 'go'},
  completed: {label: 'Завершена', tone: 'done'},
  rejected: {label: 'Отклонена', tone: 'off'},
  cancelled: {label: 'Отменена', tone: 'off'},
};
export const BLOCKING: BookingStatus[] = ['confirmed', 'paid', 'handed_over'];
export const STAGES: {key: BookingStatus; label: string}[] = [
  {key: 'requested', label: 'Запрос'}, {key: 'confirmed', label: 'Подтверждена'}, {key: 'paid', label: 'Оплачена'},
  {key: 'handed_over', label: 'Передана'}, {key: 'completed', label: 'Возвращена'},
];
