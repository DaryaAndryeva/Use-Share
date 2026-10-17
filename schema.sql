-- Use & Share — схема БД MVP (PostgreSQL 16), версия 2.
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

-- Чат по объявлению (FR-05): один диалог на пару «вещь + арендатор».
-- Отклик на запрос «ищу» — владелец отправляет автору запроса своё готовое объявление:
-- открывается обычный чат по этой вещи, первым сообщением — карточка объявления.
-- Ключ чата составной: вещь + арендатор. Второго чата по той же вещи с тем же человеком быть не может.
CREATE TABLE chats (
    renter_id   bigint       NOT NULL REFERENCES users (id),
    listing_id  bigint       NOT NULL REFERENCES listings (id),
    created_at  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (listing_id, renter_id)
);

-- Сообщения: отправитель — одна из двух сторон чата
CREATE TABLE messages (
    id          bigserial    PRIMARY KEY,
    renter_id   bigint       NOT NULL,               -- чат = (listing_id, renter_id)
    listing_id  bigint       NOT NULL,
    sender      party        NOT NULL,
    body        text         NOT NULL,               -- контакты маскируются при показе до брони
    created_at  timestamptz  NOT NULL DEFAULT now(),
    FOREIGN KEY (listing_id, renter_id) REFERENCES chats (listing_id, renter_id)
);

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
