import { useEffect } from 'react';
import { useGameStore } from '../game/core/gameStore';
import { connectedPads } from '../game/commands/gamepad';
import { t } from '../i18n/i18n';
import { GAME_VERSION } from '../game/core/changelog';

/** Sproutlings milling about the courtyard: where each starts, how far it wanders, its pace. */
const MILLERS = Array.from({ length: 16 }, (_, i) => ({
  x: 90 + ((i * 97) % 820),
  y: 500 + ((i * 53) % 70),
  wander: 40 + ((i * 31) % 90),
  seconds: 5 + ((i * 7) % 6),
  delay: -((i * 1.3) % 6),
  kind: (['ember', 'dew', 'stone', 'spark'] as const)[i % 4],
}));

const KIND_COLOURS = { ember: '#ff7a3d', dew: '#5cc4ff', stone: '#b9a48a', spark: '#ffe066' };

/**
 * The title: the Academy courtyard at dusk with the Great Clock in its tower, Sproutlings
 * milling about below, and the logo. Any key, click, tap or pad button goes on to the menu.
 * Drawn as an animated picture rather than the 3D scene, so the title needs no download.
 */
export function TitleScreen() {
  const leaveTitle = useGameStore((state) => state.leaveTitle);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.repeat || event.key === 'Tab') return;
      event.preventDefault();
      leaveTitle();
    };
    // Any pad button counts too, read every frame while the title is up.
    let frame = 0;
    const poll = (): void => {
      if (connectedPads().some((pad) => pad.buttons.some((value) => value > 0.5))) {
        leaveTitle();
        return;
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(frame);
    };
  }, [leaveTitle]);

  return (
    <main className="title-screen">
      <svg
        className="title-scene"
        viewBox="0 0 1000 620"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="title-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#24304a" />
            <stop offset="0.55" stopColor="#8a5a5c" />
            <stop offset="1" stopColor="#f0a35e" />
          </linearGradient>
          <radialGradient id="title-face" cx="0.5" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#fff6dc" />
            <stop offset="1" stopColor="#e8cf98" />
          </radialGradient>
        </defs>
        <rect width="1000" height="620" fill="url(#title-sky)" />
        <g className="title-stars">
          {Array.from({ length: 24 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 211) % 1000}
              cy={20 + ((i * 67) % 180)}
              r={i % 3 === 0 ? 1.8 : 1.1}
              style={{ animationDelay: `${(i * 0.37) % 3}s` }}
            />
          ))}
        </g>
        {/* The Academy's halls either side of the tower. */}
        <path
          d="M0,430 L0,330 L60,300 L120,330 L120,300 L200,260 L280,300 L280,340 L380,340 L380,430 Z"
          fill="#2b2432"
        />
        <path
          d="M1000,430 L1000,320 L940,290 L880,320 L880,300 L800,262 L720,300 L720,340 L620,340 L620,430 Z"
          fill="#2b2432"
        />
        <g fill="#ffcf7a" opacity="0.85">
          {[60, 150, 230, 320, 680, 770, 850, 940].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={350 + (i % 2) * 22}
              width="14"
              height="20"
              rx="7"
              className="title-window"
              style={{ animationDelay: `${i * 0.6}s` }}
            />
          ))}
        </g>
        {/* The Clock tower and the Great Clock, its hands turning. */}
        <path d="M410,430 L410,190 L500,120 L590,190 L590,430 Z" fill="#332a3a" />
        <circle cx="500" cy="235" r="62" fill="#5a4636" />
        <circle cx="500" cy="235" r="54" fill="url(#title-face)" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x="498"
            y="185"
            width="4"
            height="9"
            fill="#5a4636"
            transform={`rotate(${i * 30} 500 235)`}
          />
        ))}
        <rect
          className="title-hand hour"
          x="497"
          y="205"
          width="6"
          height="32"
          rx="3"
          fill="#3a2a20"
        />
        <rect
          className="title-hand minute"
          x="498.5"
          y="190"
          width="3"
          height="47"
          rx="1.5"
          fill="#3a2a20"
        />
        <circle cx="500" cy="235" r="5" fill="#c88a1c" />
        {/* The courtyard. */}
        <path d="M0,430 L1000,430 L1000,620 L0,620 Z" fill="#3c5a3a" />
        <path d="M0,430 Q500,470 1000,430 L1000,450 Q500,490 0,450 Z" fill="#2f4a30" />
        <g className="title-millers">
          {MILLERS.map((miller, i) => (
            <g
              key={i}
              className="title-miller"
              style={
                {
                  '--wander': `${miller.wander}px`,
                  animationDuration: `${miller.seconds}s`,
                  animationDelay: `${miller.delay}s`,
                } as React.CSSProperties
              }
            >
              <g transform={`translate(${miller.x} ${miller.y})`}>
                <g className="title-bob" style={{ animationDelay: `${miller.delay}s` }}>
                  <ellipse cx="0" cy="0" rx="9" ry="11" fill={KIND_COLOURS[miller.kind]} />
                  <circle cx="-3" cy="-3" r="1.6" fill="#1c1410" />
                  <circle cx="3" cy="-3" r="1.6" fill="#1c1410" />
                  <path d="M0,-11 Q6,-22 12,-20 Q6,-14 0,-11 Z" fill="#6fcf5f" />
                </g>
              </g>
            </g>
          ))}
        </g>
      </svg>
      <button type="button" className="title-start" onClick={leaveTitle} autoFocus>
        <span className="title-logo">{t('menu.title')}</span>
        <span className="title-tagline">{t('title.tagline')}</span>
        <span className="title-press">{t('title.press')}</span>
      </button>
      <p className="title-version">v{GAME_VERSION}</p>
    </main>
  );
}
