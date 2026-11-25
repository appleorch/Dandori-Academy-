import { t } from '../i18n/i18n';
import { useState, type ReactNode } from 'react';
import { SPROUT_KINDS } from '../game/workers/sprouts';
import { KindGlyph } from './KindGlyph';
import { MANUAL, type ManualPicture } from './manual';

const WARDEN = '#ffb347';
const SPROUT = '#ff7a3d';
const INK = '#fff6dc';

/** A small sprout figure for the pictures. */
const sprout = (x: number, y: number, fill = SPROUT) => (
  <g key={`${x},${y}`}>
    <ellipse cx={x} cy={y} rx={5} ry={6} fill={fill} />
    <path d={`M${x},${y - 6} q4,-7 8,-6 q-4,4 -8,6z`} fill="#6fcf5f" />
  </g>
);
const warden = (x: number, y: number) => (
  <g>
    <circle cx={x} cy={y - 10} r={6} fill={WARDEN} />
    <rect x={x - 6} y={y - 4} width={12} height={14} rx={4} fill={WARDEN} />
  </g>
);

/** Each page's picture, drawn plainly. Decorative: the text says everything. */
const PICTURES: Record<ManualPicture, ReactNode> = {
  throw: (
    <>
      {warden(30, 70)}
      {sprout(18, 80)}
      {sprout(8, 84)}
      <path d="M40,60 Q90,0 140,58" fill="none" stroke={INK} strokeDasharray="4 4" />
      {sprout(140, 64)}
      <circle cx={140} cy={70} r={10} fill="none" stroke={WARDEN} />
    </>
  ),
  whistle: (
    <>
      {warden(90, 60)}
      {[18, 32, 46].map((r) => (
        <circle key={r} cx={90} cy={56} r={r} fill="none" stroke={INK} opacity={0.7 - r / 100} />
      ))}
      {sprout(40, 70)}
      {sprout(140, 50)}
      {sprout(120, 84)}
    </>
  ),
  kinds: (
    <g>
      {SPROUT_KINDS.map((kind, i) => (
        <foreignObject key={kind} x={12 + i * 42} y={30} width={36} height={36}>
          <KindGlyph kind={kind} />
        </foreignObject>
      ))}
    </g>
  ),
  carry: (
    <>
      <polygon points="80,30 96,40 90,58 70,58 64,40" fill="#ffe066" />
      {sprout(66, 66)}
      {sprout(80, 68)}
      {sprout(94, 66)}
      <text x={80} y={24} fill={INK} fontSize={11} textAnchor="middle">
        3/3
      </text>
      <path d="M110,56 L160,56" stroke={INK} markerEnd="url(#manual-arrow)" />
      <rect x={162} y={40} width={14} height={26} rx={4} fill="#c88a1c" />
    </>
  ),
  beasts: (
    <>
      <ellipse cx={110} cy={56} rx={34} ry={22} fill="#7a5a48" />
      <circle cx={126} cy={48} r={4} fill={INK} />
      <path d="M144,56 L170,56" stroke="#ff4632" strokeWidth={3} />
      <circle cx={162} cy={66} r={10} fill="rgba(255,70,50,0.35)" />
      {sprout(50, 70)}
      {sprout(36, 76)}
    </>
  ),
  gates: (
    <>
      <rect x={70} y={20} width={14} height={66} fill="#6b8a4a" />
      <path d="M74,30 l6,10 l-6,10 l6,10" stroke="#3c2a1c" fill="none" />
      {sprout(56, 60)}
      {sprout(46, 72)}
      <rect x={110} y={60} width={60} height={8} fill="#a0774f" />
      <path d="M110,74 Q140,90 170,74" fill="#2e5a7a" />
    </>
  ),
  day: (
    <>
      <circle cx={90} cy={54} r={32} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={8} />
      <path d="M90,22 A32,32 0 1,1 58,54" fill="none" stroke={WARDEN} strokeWidth={8} />
      <path d="M58,54 A32,32 0 0,1 90,22" fill="none" stroke="#ff4632" strokeWidth={8} />
      <circle cx={58} cy={54} r={6} fill="#ffe066" />
    </>
  ),
  story: (
    <>
      <circle cx={90} cy={52} r={30} fill="#e8cf98" stroke="#5a4636" strokeWidth={5} />
      <rect x={88} y={30} width={4} height={24} fill="#3a2a20" />
      <rect x={88} y={50} width={18} height={4} fill="#3a2a20" />
      <circle cx={146} cy={40} r={7} fill="#c88a1c" />
      <circle cx={34} cy={64} r={7} fill="#c88a1c" />
    </>
  ),
  wardens: (
    <>
      {warden(50, 66)}
      {warden(130, 66)}
      {sprout(30, 80)}
      {sprout(150, 80)}
      <path d="M64,50 L116,50" stroke={INK} strokeDasharray="3 3" />
      <circle cx={90} cy={30} r={9} fill="#ff7a3d" opacity={0.7} />
    </>
  ),
  modes: (
    <>
      <circle cx={40} cy={54} r={18} fill="#ffd66b" stroke="#c88a1c" strokeWidth={4} />
      <rect x={76} y={36} width={30} height={36} rx={4} fill="#5cc4ff" />
      <path d="M130,72 L140,36 L150,72 Z" fill="#ff7a3d" />
      <path d="M150,72 L160,44 L170,72 Z" fill="#b9a48a" />
    </>
  ),
};

/**
 * The manual: a page for every mechanic, each with a picture. Opened from pause; arrow keys,
 * the D-pad and the page list move between pages.
 */
export function Manual({ onClose }: { onClose: () => void }) {
  const [at, setAt] = useState(0);
  const page = MANUAL[at];
  return (
    <div className="manual">
      <nav className="manual-pages" aria-label={t('ui.manual.manualPages')}>
        {MANUAL.map((entry, i) => (
          <button
            key={entry.id}
            type="button"
            className={i === at ? 'tab active' : 'tab'}
            aria-current={i === at ? 'page' : undefined}
            onClick={() => setAt(i)}
          >
            {entry.title}
          </button>
        ))}
      </nav>
      <article className="manual-page" aria-live="polite">
        <svg className="manual-picture" viewBox="0 0 180 100" aria-hidden="true">
          <defs>
            <marker
              id="manual-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={INK} />
            </marker>
          </defs>
          {PICTURES[page.picture]}
        </svg>
        <h2>{page.title}</h2>
        {page.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </article>
      <div className="manual-turn">
        <button
          type="button"
          className="secondary small"
          disabled={at === 0}
          onClick={() => setAt(at - 1)}
        >
          {t('ui.manual.previous')}
        </button>
        <button
          type="button"
          className="secondary small"
          disabled={at === MANUAL.length - 1}
          onClick={() => setAt(at + 1)}
        >
          {t('ui.manual.next')}
        </button>
      </div>
      <button type="button" onClick={onClose} autoFocus>
        {t('ui.manual.back')}
      </button>
    </div>
  );
}
