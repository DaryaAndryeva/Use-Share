-- Use & Share — схема БД MVP (PostgreSQL 16), версия 3.
-- Одна таблица — одно понятие: пользователь, вещь, чат, бронь, платёж.
-- Данные карт не хранятся: их вводят в форме платёжного провайдера (NFR-03).

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE category       AS ENUM ('tools', 'tourism', 'photo', 'kids', 'sport', 'party', 'kitchen');
CREATE TYPE listing_status AS ENUM ('active', 'hidden', 'archived');
CREATE TYPE booking_status AS ENUM ('requested', 'rejected', 'cancelled', 'confirmed', 'paid', 'handed_over', 'completed');
CREATE TYPE party          AS ENUM ('renter', 'owner');   -- сторона сделки: арендатор или владелец
CREATE TYPE payment_kind   AS ENUM ('rent', 'deposit_hold', 'deposit_release', 'payout');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed');

-- Пользователи: вход через Telegram (FR-01), блокировка (FR-10)
CREATE TABLE users (
    id                 bigserial    PRIMARY KEY,
    telegram_id        bigint       NOT NULL UNIQUE,
    telegram_username  text,                          -- виден другой стороне после брони
    name               text         NOT NULL,         -- из профиля Telegram
    photo_url          text,
    role               text         NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator')),
    is_blocked         boolean      NOT NULL DEFAULT false,
    pdn_consent_at     timestamptz  NOT NULL,         -- без согласия на ПДн регистрации нет
    created_at         timestamptz  NOT NULL DEFAULT now()
);

-- Объявления «сдаю» (FR-02, FR-04, FR-09)
CREATE TABLE listings (
    id              bigserial       PRIMARY KEY,
    owner_id        bigint          NOT NULL REFERENCES users (id),
    category        category        NOT NULL,
    title           text            NOT NULL,
    description     text,
    photos          text[]          NOT NULL CHECK (cardinality(photos) BETWEEN 1 AND 10),
    price_per_hour  numeric(10, 2),
    price_per_day   numeric(10, 2),
    deposit         numeric(10, 2)  NOT NULL CHECK (deposit >= 0),
    district        text            NOT NULL,
    location        point           NOT NULL,         -- координаты для фильтра «до 2 км»
    status          listing_status  NOT NULL DEFAULT 'active',
    promoted_until  timestamptz,                      -- платное продвижение на 7 дней
    created_at      timestamptz     NOT NULL DEFAULT now(),
    CHECK (price_per_hour IS NOT NULL OR price_per_day IS NOT NULL)
);

-- Запрос «ищу» (FR-03): владельцы в радиусе 5 км получают уведомление
CREATE TABLE search_requests (
    id           bigserial       PRIMARY KEY,
    author_id    bigint          NOT NULL REFERENCES users (id),
    category     category        NOT NULL,
    description  text,
    starts_at    timestamptz     NOT NULL,
    ends_at      timestamptz     NOT NULL,
    max_price    numeric(10, 2),
    location     point           NOT NULL,
    created_at   timestamptz     NOT NULL DEFAULT now(),
    closed_at    timestamptz,                         -- автор забронировал вещь или снял запрос
    CHECK (ends_at > starts_at)
);

-- Чат по объявлению (FR-05): один диалог на пару «вещь + арендатор», сколько бы броней по ней ни было.
-- Владелец не хранится — он берётся из listings.owner_id.
-- Отклик на запрос «ищу» (FR-03) — владелец пишет автору запроса в такой же чат по своей вещи
-- (новый или уже существующий); ссылка на запрос остаётся, чтобы считать, сколько откликов принесли запросы (M-2).
CREATE TABLE chats (
    id                 bigserial    PRIMARY KEY,
    listing_id         bigint       NOT NULL REFERENCES listings (id),
    renter_id          bigint       NOT NULL REFERENCES users (id),
    search_request_id  bigint       REFERENCES search_requests (id),   -- запрос «ищу», на который был отклик в этом чате
    created_at         timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (listing_id, renter_id)                    -- второго чата по той же вещи с тем же человеком быть не может
);
CREATE INDEX chats_renter_idx ON chats (renter_id);   -- «мои чаты» арендатора; для владельца — через listings.owner_id

-- Сообщения: пишет одна из двух сторон чата, читает всегда другая — поэтому отметка о прочтении одна.
-- Клиент получает новые сообщения опросом «WHERE chat_id = ? AND id > последний виденный».
CREATE TABLE messages (
    id             bigserial    PRIMARY KEY,
    chat_id        bigint       NOT NULL REFERENCES chats (id),
    sender         party        NOT NULL,                       -- renter / owner
    body           text         NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),  -- контакты маскируются при показе до брони
    client_msg_id  uuid         NOT NULL DEFAULT gen_random_uuid(),  -- повторная отправка по плохой сети не создаёт дубль
    created_at     timestamptz  NOT NULL DEFAULT now(),
    read_at        timestamptz,                                 -- когда прочитала другая сторона
    UNIQUE (chat_id, client_msg_id)
);
CREATE INDEX messages_chat_idx ON messages (chat_id, id);     -- история чата и выборка «что нового после id N»

-- Бронь (FR-06): от запроса до возврата вещи
CREATE TABLE bookings (
    id                 bigserial       PRIMARY KEY,
    renter_id          bigint          NOT NULL REFERENCES users (id),
    listing_id         bigint          NOT NULL REFERENCES listings (id),
    starts_at          timestamptz     NOT NULL,
    ends_at            timestamptz     NOT NULL,
    status             booking_status  NOT NULL DEFAULT 'requested',
    rent_amount        numeric(10, 2)  NOT NULL,     -- цена × длительность
    commission_amount  numeric(10, 2)  NOT NULL,     -- 10 %, платит арендатор
    deposit_amount     numeric(10, 2)  NOT NULL,
    handover_photos    text[],                        -- фото при передаче (FR-07)
    return_photos      text[],                        -- фото при возврате
    created_at         timestamptz     NOT NULL DEFAULT now(),
    completed_at       timestamptz,
    CHECK (ends_at > starts_at),
    -- подтверждённый период занят: пересекающуюся бронь на ту же вещь создать нельзя
    EXCLUDE USING gist (listing_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
        WHERE (status IN ('confirmed', 'paid', 'handed_over'))
);

-- Платежи по брони (FR-07, NFR-02): оплата, удержание и возврат залога, выплата владельцу
CREATE TABLE payments (
    id                   bigserial       PRIMARY KEY,
    booking_id           bigint          NOT NULL REFERENCES bookings (id),
    kind                 payment_kind    NOT NULL,
    amount               numeric(10, 2)  NOT NULL CHECK (amount > 0),
    status               payment_status  NOT NULL DEFAULT 'pending',
    provider_payment_id  text UNIQUE,                 -- id операции у провайдера
    idempotency_key      uuid NOT NULL UNIQUE,        -- повторный клик не создаёт второе списание
    created_at           timestamptz     NOT NULL DEFAULT now()
);

-- Метрики M-1…M-4 (FR-11) считаются запросами по таблицам выше; журнал событий, жалобы и отзывы пока не ведём.
