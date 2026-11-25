import { t } from '../i18n/i18n';
import { useEffect, useState } from 'react';
import type { InputController } from '../game/commands/input';
import { SPROUT_KINDS, SPROUTS, type SproutKind } from '../game/workers/sprouts';
import { KindGlyph } from './KindGlyph';
import { formatTime } from './format';

/** The story's sunset: the last minute of the day, when everyone must be home. */
const SUNSET_SECONDS = 60;

/**
 * The story's clock as a dial: daylight left as an arc running down, the sunset minute marked
 * in red, and the sun riding the arc's end. The seconds left are written in the middle.
 */
export function ClockDial({ timeLeft, dayLength }: { timeLeft: number; dayLength: number }) {
  const r = 18;
  const around = 2 * Math.PI * r;
  const left = Math.max(0, Math.min(1, timeLeft / dayLength));
  const sunsetShare = Math.min(1, SUNSET_SECONDS / dayLength);
  const angle = left * 2 * Math.PI - Math.PI / 2;
  const sunset = timeLeft <= SUNSET_SECONDS;
  return (
    <span className={sunset ? 'clock-dial sunset' : 'clock-dial'}>
      <svg viewBox="-24 -24 48 48" aria-hidden="true">
        <circle className="dial-track" r={r} />
        <circle
          className="dial-sunset"
          r={r}
          strokeDasharray={`${around * sunsetShare} ${around}`}
          transform="rotate(-90)"
        />
        <circle
          className="dial-day"
          r={r}
          strokeDasharray={`${around * Math.max(0, left - sunsetShare)} ${around}`}
          strokeDashoffset={-around * sunsetShare}
          transform="rotate(-90)"
        />
        <circle className="dial-sun" cx={Math.cos(angle) * r} cy={Math.sin(angle) * r} r={4} />
      </svg>
      <span className="dial-time">{formatTime(timeLeft)}</span>
    </span>
  );
}

/** Where the wheel's four slices sit, in the order wheelSlot counts them: up, right, down, left. */
const SLICES = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/**
 * The kind wheel, for pads: held open (D-pad right by default), the right stick points at a
 * kind, and letting go chooses it. Drawn while open; read from the input each frame.
 */
export function KindWheel({
  input,
  squad,
}: {
  input?: InputController;
  squad: Readonly<Record<SproutKind, number>>;
}) {
  const [wheel, setWheel] = useState<{ open: boolean; pick: number | null }>({
    open: false,
    pick: null,
  });
  useEffect(() => {
    if (!input) return;
    let frame = 0;
    const read = (): void => {
      const next = input.wheel();
      setWheel((was) => (was.open === next.open && was.pick === next.pick ? was : next));
      frame = requestAnimationFrame(read);
    };
    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [input]);
  if (!wheel.open) return null;
  return (
    <div className="kind-wheel" role="listbox" aria-label={t('ui.hudParts.chooseAKind')}>
      {SPROUT_KINDS.map((kind, i) => (
        <div
          key={kind}
          role="option"
          aria-selected={wheel.pick === i}
          className={`wheel-slice ${kind}${wheel.pick === i ? ' picked' : ''}${squad[kind] === 0 ? ' none' : ''}`}
          style={{ left: `${50 + SLICES[i].x * 34}%`, top: `${50 + SLICES[i].y * 34}%` }}
        >
          <KindGlyph kind={kind} />
          <strong>{squad[kind]}</strong>
          <small>{SPROUTS[kind].plural}</small>
        </div>
      ))}
    </div>
  );
}

const DETAILS_KEY = 'dandori-hud-details';

/** Whether the HUD's secondary panel is open: remembered in this browser, closed by default. */
export function useHudDetails(): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(DETAILS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setOpen((was) => {
      try {
        localStorage.setItem(DETAILS_KEY, was ? '0' : '1');
      } catch {
        // Storage blocked: the choice lasts for this day only.
      }
      return !was;
    });
  return [open, toggle];
}
