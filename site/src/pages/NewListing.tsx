import {Check, ImagePlus, X} from 'lucide-react';
import * as React from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {Picto, Plate} from '../art';
import {CATEGORIES, type CategorySlug, DISTRICTS, rub} from '../data';
import {useStore} from '../store';
import {Note, RouteLine, useAct} from '../ui';

const ARTS: Record<CategorySlug, string> = {tools: 'drill', tourism: 'tent', photo: 'camera', kids: 'stroller', sport: 'bike', party: 'speaker', kitchen: 'mixer'};

export function NeedLogin({what}: {what: string}) {
  return (
    <div className="login">
      <h1>Войдите, чтобы {what}</h1>
      <p className="muted">Вход и регистрация — через Telegram, без пароля. Имя и фото подтянем из профиля.</p>
      <Link className="btn btn-tg btn-l" to="/login">Войти через Telegram</Link>
    </div>
  );
}

export function NewListing() {
  const s = useStore();
  const nav = useNavigate();
  const act = useAct();
  const {id} = useParams();
  const [qp] = useSearchParams();
  const edit = id ? s.listing(Number(id)) : undefined;
  const [cat, setCat] = React.useState<CategorySlug | null>(edit?.category ?? (qp.get('cat') as CategorySlug) ?? null);
  const [title, setTitle] = React.useState(edit?.title ?? '');
  const [desc, setDesc] = React.useState(edit?.description ?? '');
  const [kit, setKit] = React.useState(edit?.kit.join('\n') ?? '');
  const [photos, setPhotos] = React.useState(edit?.photos ?? 0);
  const [ph, setPh] = React.useState(edit?.priceHour ? String(edit.priceHour) : '');
  const [pd, setPd] = React.useState(edit?.priceDay ? String(edit.priceDay) : '');
  const [dep, setDep] = React.useState(edit ? String(edit.deposit) : '');
  const [dist, setDist] = React.useState(edit?.districtId ?? s.me?.districtId ?? 1);
  const [tried, setTried] = React.useState(false);
  if (!s.me) return <NeedLogin what="разместить вещь" />;
  if (id && (!edit || edit.ownerId !== s.me.id)) return <div className="empty"><h3>Это объявление нельзя редактировать</h3><Link className="btn btn-ink" to="/me/listings">Мои вещи</Link></div>;

  const num = (v: string) => (v.trim() ? Number(v.replace(/\D/g, '')) : null);
  const errs = {
    cat: !cat ? 'Выберите категорию' : '',
    title: title.trim().length < 3 ? 'Напишите, что за вещь — хотя бы 3 буквы' : '',
    photos: photos < 1 ? 'Нужно хотя бы одно фото' : photos > 10 ? 'Не больше 10 фото' : '',
    price: !num(ph) && !num(pd) ? 'Укажите цену за час или за сутки' : '',
    dep: dep.trim() === '' ? 'Укажите залог — можно 0 ₽' : '',
  };
  const ok = Object.values(errs).every((x) => !x);
  const show = (k: keyof typeof errs) => (tried && errs[k] ? errs[k] : '');
  const art = edit?.art && edit.category === cat ? edit.art : cat ? ARTS[cat] : 'toolcase';
  const publish = () => {
    setTried(true);
    if (!ok) {
      document.querySelector('.field.bad, .bad-box')?.scrollIntoView({behavior: 'smooth', block: 'center'});
      return;
    }
    const lid = act(() => s.saveListing({
      category: cat!, art, title: title.trim(), description: desc.trim(), kit: kit.split('\n').map((x) => x.trim()).filter(Boolean),
      priceHour: num(ph), priceDay: num(pd), deposit: num(dep) ?? 0, districtId: dist, photos,
    }, edit?.id), edit ? 'Изменения сохранены' : 'Объявление опубликовано — его уже видно в поиске');
    if (lid) nav(`/listing/${lid}`);
  };
  const steps: [string, boolean][] = [['Категория и название', !errs.cat && !errs.title], ['Фото', !errs.photos], ['Цена и залог', !errs.price && !errs.dep], ['Район', true]];

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{edit ? 'Изменить объявление' : 'Сдать вещь'}</h1>
          <p>{edit ? 'Изменения сразу видны в каталоге.' : 'Размещение бесплатное. Комиссию 10 % платит арендатор, вы получаете цену аренды целиком.'}</p>
        </div>
      </div>
      <div className="formgrid">
        <div className="formcol">
          <section className="fs" aria-labelledby="s1">
            <h2 id="s1"><i>1</i>Что сдаёте</h2>
            <div className={'field' + (show('cat') ? ' bad' : '')}>
              <span>Категория</span>
              <div className={'catpick' + (show('cat') ? ' bad-box' : '')} style={show('cat') ? {padding: 6, borderRadius: 8, border: '1.5px solid var(--danger)'} : undefined}>
                {CATEGORIES.map((c) => (
                  <button key={c.slug} type="button" aria-pressed={cat === c.slug} onClick={() => setCat(c.slug)} data-line={c.slug}>
                    <span className="plate"><Picto name={c.slug} size={22} /></span>{c.name}
                  </button>
                ))}
              </div>
              {show('cat') ? <small>{show('cat')}</small> : null}
            </div>
            <label className={'field' + (show('title') ? ' bad' : '')}>
              <span>Название</span>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, перфоратор Makita HR2470" maxLength={80} />
              <small>{show('title') || 'Модель и главное свойство: так вещь быстрее найдут.'}</small>
            </label>
            <label className="field">
              <span>Описание</span>
              <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Состояние, для чего подходит, особенности" />
            </label>
            <label className="field">
              <span>Что входит в комплект</span>
              <textarea className="textarea" style={{minHeight: 84}} value={kit} onChange={(e) => setKit(e.target.value)} placeholder={'Каждый предмет с новой строки\nКейс\nЗарядное устройство'} />
            </label>
          </section>

          <section className="fs" aria-labelledby="s2">
            <h2 id="s2"><i>2</i>Фото</h2>
            <div className={'field' + (show('photos') ? ' bad' : '')}>
              <div className="photos">
                {Array.from({length: photos}, (_, i) => (
                  <div key={i} className="photo">
                    <Plate art={art} cat={cat ?? 'tools'} size="l" label={`Фото ${i + 1}`} />
                    <button type="button" onClick={() => setPhotos((n) => n - 1)} aria-label={`Удалить фото ${i + 1}`}><X size={14} /></button>
                  </div>
                ))}
                {photos < 10 ? (
                  <button type="button" className={'addphoto' + (show('photos') ? ' bad-box' : '')} onClick={() => setPhotos((n) => n + 1)}>
                    <ImagePlus size={24} />Добавить
                  </button>
                ) : null}
              </div>
              <small>{show('photos') || `От 1 до 10 фото, сейчас ${photos}. В демо вместо снимка появляется табличка категории.`}</small>
            </div>
          </section>

          <section className="fs" aria-labelledby="s3">
            <h2 id="s3"><i>3</i>Цена и залог</h2>
            <div className="two">
              <label className={'field' + (show('price') ? ' bad' : '')}>
                <span>За час, ₽</span>
                <input className="input num" inputMode="numeric" value={ph} onChange={(e) => setPh(e.target.value.replace(/\D/g, ''))} placeholder="например, 60" />
              </label>
              <label className={'field' + (show('price') ? ' bad' : '')}>
                <span>За сутки, ₽</span>
                <input className="input num" inputMode="numeric" value={pd} onChange={(e) => setPd(e.target.value.replace(/\D/g, ''))} placeholder="например, 400" />
              </label>
            </div>
            {show('price') ? <p className="field bad"><small>{show('price')}</small></p> : <Note>Можно указать обе цены: на короткий срок посчитаем по часам, если так выйдет дешевле.</Note>}
            <label className={'field' + (show('dep') ? ' bad' : '')}>
              <span>Залог, ₽</span>
              <input className="input num" inputMode="numeric" value={dep} onChange={(e) => setDep(e.target.value.replace(/\D/g, ''))} placeholder="например, 3000" />
              <small>{show('dep') || 'Сервис удерживает залог у арендатора и возвращает, когда вы подтвердите возврат вещи.'}</small>
            </label>
          </section>

          <section className="fs" aria-labelledby="s4">
            <h2 id="s4"><i>4</i>Где забрать</h2>
            <label className="field">
              <span>Район</span>
              <select className="select" value={dist} onChange={(e) => setDist(+e.target.value)}>
                {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <small>Точный адрес арендатор узнает в чате только после подтверждённой брони.</small>
            </label>
          </section>
          <div className="steps-done mobile-block">
            {steps.map(([t, done]) => <div key={t} className={done ? 'ok' : ''}><i>{done ? <Check size={12} strokeWidth={4} /> : null}</i>{t}</div>)}
          </div>
          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            <button type="button" className="btn btn-go btn-l" onClick={publish}>{edit ? 'Сохранить' : 'Опубликовать'}</button>
            {edit ? (
              <button type="button" className="btn btn-line btn-l" onClick={() => {
                act(() => s.setListingStatus(edit.id, edit.status === 'archived' ? 'active' : 'archived'), edit.status === 'archived' ? 'Снова в каталоге' : 'Снято с публикации');
                nav('/me/listings');
              }}>{edit.status === 'archived' ? 'Вернуть в каталог' : 'Снять с публикации'}</button>
            ) : null}
            {tried && !ok ? <span className="alert alert-bad" role="alert">Заполните отмеченные поля</span> : null}
          </div>
        </div>

        <aside className="preview" aria-label="Как увидят соседи">
          <b>Так увидят соседи</b>
          <div className="item" style={{pointerEvents: 'none'}}>
            <Plate art={art} cat={cat ?? 'tools'} size="xl" />
            <span className="item-price">
              <b>{num(pd) ? rub(num(pd)!) : num(ph) ? rub(num(ph)!) : '— ₽'}</b>
              <span>{num(pd) ? 'сутки' : num(ph) ? 'час' : 'цена'}{num(ph) && num(pd) ? ` · ${rub(num(ph)!)} час` : ''}</span>
            </span>
            <span className="item-t">{title.trim() || 'Название вещи'}</span>
            <RouteLine m={400} cat={cat ?? 'tools'} />
            <span className="item-m"><span>{DISTRICTS.find((d) => d.id === dist)!.name}</span><span>залог {num(dep) !== null ? rub(num(dep)!) : '—'}</span></span>
          </div>
          <div className="steps-done">
            {steps.map(([t, done]) => <div key={t} className={done ? 'ok' : ''}><i>{done ? <Check size={12} strokeWidth={4} /> : null}</i>{t}</div>)}
          </div>
        </aside>
      </div>
    </>
  );
}
