import {Send} from 'lucide-react';
import * as React from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {district} from '../data';
import {useStore} from '../store';
import {Ava, Note} from '../ui';

const DEMO = [
  {id: 6, who: 'Берёт палатку на выходные и сдаёт миксер'},
  {id: 2, who: 'Сдаёт инструмент: на дрель пришёл запрос'},
  {id: 9, who: 'Ищет штатив, сейчас катается на велосипеде'},
  {id: 10, who: 'Модератор: скрывает объявления, блокирует'},
];

export function Login() {
  const s = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [agree, setAgree] = React.useState(true);
  const back = (loc.state as {back?: string} | null)?.back ?? '/me';
  return (
    <div className="login">
      <h1>Вход через Telegram</h1>
      <p className="muted">Без пароля: имя и фото подтянем из профиля Telegram. Ник увидит только тот, с кем вы договорились о брони.</p>
      <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />Согласен на обработку персональных данных — без этого регистрация не завершится</label>
      <div className="panel">
        <b>Демо: выберите, кем войти</b>
        <div className="whos">
          {DEMO.map((d) => {
            const u = s.user(d.id);
            return (
              <button key={d.id} type="button" className="whobtn" disabled={!agree} onClick={() => {
                s.login(u.id);
                nav(back);
              }}>
                <Ava name={u.name} />
                <span><b>{u.name}</b><small>{d.who} · {district(u.districtId).name}</small></span>
                <Send size={18} style={{marginLeft: 'auto', color: '#229ed9'}} />
              </button>
            );
          })}
        </div>
        {!agree ? <div className="alert alert-wait" role="alert">Отметьте согласие на обработку данных, чтобы продолжить</div> : null}
      </div>
      <Note>В настоящем сервисе здесь кнопка Telegram Login: подтверждение приходит в приложение Telegram.</Note>
    </div>
  );
}
