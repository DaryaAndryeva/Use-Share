// Пиктограммы вещей и категорий — как на городских указателях: белый рисунок одной толщины на цвете линии.
import type {CategorySlug} from './data';

const P: Record<string, React.ReactNode> = {
  drill: (<><path d="M8 15h20a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8z" /><path d="M33 20h7" /><path d="M14 25l3 13h7l-2-13" /><circle cx="23" cy="20" r="1.6" fill="currentColor" stroke="none" /></>),
  perforator: (<><path d="M6 17h22l4 3v5H6z" /><path d="M32 21h10" /><path d="M10 25l-1 13h8l2-13" /><path d="M20 12v5" /></>),
  toolcase: (<><rect x="6" y="15" width="36" height="22" rx="2" /><path d="M18 15v-4h12v4" /><path d="M6 25h36" /><path d="M21 23h6v4h-6z" /></>),
  ladder: (<><path d="M16 6l-6 36" /><path d="M32 6l6 36" /><path d="M14.7 14h18.6M13.4 22h21.2M12 30h24M10.7 38h26.6" /></>),
  tent: (<><path d="M24 7L5 40h38z" /><path d="M24 7l-7 33M24 7l7 33" /><path d="M20 40l4-11 4 11" /></>),
  sup: (<><path d="M5 30c6-5 32-5 38 0-6 5-32 5-38 0z" /><path d="M24 30V8" /><path d="M20 8h8" /><path d="M21 38h6" /></>),
  projector: (<><rect x="6" y="14" width="36" height="18" rx="3" /><circle cx="31" cy="23" r="5" /><path d="M11 20h8M11 25h6" /><path d="M11 32l-2 5M37 32l2 5" /></>),
  camera: (<><path d="M6 16h8l3-5h14l3 5h8v22H6z" /><circle cx="24" cy="26" r="7" /><path d="M36 20h2" /></>),
  lens: (<><rect x="12" y="10" width="24" height="28" rx="3" /><path d="M12 18h24M12 30h24" /><path d="M18 18v12M24 18v12M30 18v12" /></>),
  stroller: (<><path d="M10 10h6l4 16h18" /><path d="M20 26c0-9 6-14 14-14h4v14" /><circle cx="17" cy="37" r="3.5" /><circle cx="35" cy="37" r="3.5" /></>),
  bike: (<><circle cx="12" cy="31" r="7" /><circle cx="36" cy="31" r="7" /><path d="M12 31l7-14h12l5 14M19 17l7 14h-14M24 13h6" /><path d="M31 17l-5 14" /></>),
  scooter: (<><path d="M33 8h6" /><path d="M36 8l-4 27" /><path d="M10 35h22" /><circle cx="10" cy="37" r="3.5" /><circle cx="34" cy="37" r="3.5" /></>),
  speaker: (<><rect x="12" y="6" width="24" height="36" rx="3" /><circle cx="24" cy="28" r="7" /><circle cx="24" cy="14" r="3" /><circle cx="24" cy="28" r="2" fill="currentColor" stroke="none" /></>),
  picnic: (<><path d="M7 21h34l-4 18H11z" /><path d="M14 21c0-8 20-8 20 0" /><path d="M9 29h30" /></>),
  vacuum: (<><rect x="16" y="20" width="20" height="18" rx="5" /><path d="M20 20V12c0-3 3-5 6-5h8" /><path d="M10 40h10" /><path d="M16 32l-6 8" /><circle cx="26" cy="29" r="3" /></>),
  mixer: (<><path d="M10 12h24a4 4 0 0 1 4 4v4H10z" /><path d="M14 20v6M26 20v4" /><path d="M8 28h26l-3 10H11z" /><path d="M38 20v20H30" /></>),
  // категории
  tools: (<><path d="M30 8a8 8 0 0 0-9 10L8 31a3.5 3.5 0 0 0 5 5l13-13a8 8 0 0 0 10-9l-5 5-4-1-1-4z" /></>),
  tourism: (<><path d="M24 8L6 40h36z" /><path d="M24 8l-6 32M24 8l6 32" /></>),
  photo: (<><path d="M6 16h8l3-5h14l3 5h8v22H6z" /><circle cx="24" cy="26" r="7" /></>),
  kids: (<><path d="M10 10h6l4 16h18" /><path d="M20 26c0-9 6-14 14-14h4v14" /><circle cx="17" cy="37" r="3.5" /><circle cx="35" cy="37" r="3.5" /></>),
  sport: (<><circle cx="12" cy="31" r="7" /><circle cx="36" cy="31" r="7" /><path d="M12 31l7-14h12l5 14M19 17l7 14h-14M24 13h6" /></>),
  party: (<><path d="M17 6c-6 0-10 5-10 11 0 7 7 12 10 12s10-5 10-12c0-6-4-11-10-11z" /><path d="M17 29l-2 3h4z" /><path d="M17 32c0 5 4 5 4 10" /><path d="M33 12c-4 0-7 3-7 8" /><path d="M35 18c-3 0-5 2-5 6 0 5 5 9 7 9s7-4 7-9c0-4-4-6-9-6z" /></>),
  kitchen: (<><path d="M8 22h32v6a12 12 0 0 1-12 12h-8A12 12 0 0 1 8 28z" /><path d="M4 22h4M40 22h4" /><path d="M18 8c-2 3 2 5 0 8M26 8c-2 3 2 5 0 8M34 8c-2 3 2 5 0 8" /></>),
  request: (<><circle cx="21" cy="21" r="12" /><path d="M30 30l11 11" /><path d="M17 17c1-3 7-3 8 0 1 3-4 3-4 7M21 27v1" /></>),
};

export function Picto({name, size = 48, className}: {name: string; size?: number; className?: string}) {
  return (
    <svg className={className} viewBox="0 0 48 48" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.toolcase}
    </svg>
  );
}

/** Табличка вещи: квадрат цвета линии категории с белой пиктограммой. Вместо фото, пока владелец их не загрузил. */
export function Plate({art, cat, size = 'm', label}: {art: string; cat: CategorySlug; size?: 's' | 'm' | 'l' | 'xl'; label?: string}) {
  const px = {s: 28, m: 44, l: 72, xl: 132}[size];
  return (
    <span className={`plate plate-${size}`} data-line={cat} role={label ? 'img' : undefined} aria-label={label}>
      <Picto name={art} size={px} />
    </span>
  );
}

export function Logo({className}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#1E3A66" />
      <path stroke="#3FBF9B" d="M18 15.5 24 12l6 3.5-6 3.5-6-3.5Z" />
      <path stroke="#E8B86D" d="M18 15.5V23l6 3.5 6-3.5v-7.5" />
      <path stroke="#fff" d="M6.5 29c4-3 7.5-3.3 11-.8l4.5 3.3c1.7 1.2.5 4-1.5 3.2l-5-2M41.5 29c-4-3-7.5-3.3-11-.8L26 31.5c-1.7 1.2-.5 4 1.5 3.2l5-2" />
    </svg>
  );
}
