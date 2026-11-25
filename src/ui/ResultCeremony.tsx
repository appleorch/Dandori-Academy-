import { useState } from 'react';
import type { DayResult } from '../game/core/gameStore';
import { timeMedal } from '../game/modes/timeAttack';
import { MODES } from '../game/modes/modes';
import type { LevelDefinition } from '../game/world/level';
import { formatTime } from './format';

/** What a day earned, to be awarded: its medal, and the line that goes under it. */
export interface Award {
  medal: string;
  /** For the medal's colours: a rank in lower case, or a battle's outcome. */
  tone: string;
  line: string;
}

/** The award for a day, or null when the day earns none (a story day, an uncleared lesson). */
export function awardFor(result: DayResult, level: LevelDefinition): Award | null {
  if (result.challenge) {
    return {
      medal: result.challenge.rank,
      tone: result.challenge.rank.toLowerCase(),
      line: `${result.challenge.total} points`,
    };
  }
  if (result.battle) {
    const medal = { won: 'Won', lost: 'Lost', drawn: 'Draw' }[result.battle.outcome];
    return {
      medal,
      tone: `battle-${result.battle.outcome}`,
      line: `${result.battle.you} to ${result.battle.rival} ${result.battle.unit}`,
    };
  }
  if (result.mode === 'lessons' && result.clearTime !== null) {
    const medal = timeMedal(level, result.clearTime);
    return { medal, tone: medal.toLowerCase(), line: `Cleared in ${formatTime(result.clearTime)}` };
  }
  return null;
}

/** Colours for a medal disc and the card, by tone: [face, rim]. */
const TONES: Record<string, readonly [string, string]> = {
  diamond: ['#bdf3ff', '#5fc6e0'],
  platinum: ['#e9eef2', '#9aa8b4'],
  gold: ['#ffd66b', '#c88a1c'],
  silver: ['#dfe3e6', '#8f979d'],
  bronze: ['#e2a06a', '#8e5426'],
  copper: ['#c9805c', '#7a3f26'],
  'battle-won': ['#ffd66b', '#c88a1c'],
  'battle-drawn': ['#dfe3e6', '#8f979d'],
  'battle-lost': ['#a3958a', '#5a4d44'],
};
const toneOf = (tone: string) => TONES[tone] ?? TONES.bronze;

/** Whether motion is to be kept still: the setting, or the system's preference. */
function stillness(): boolean {
  if (typeof document === 'undefined') return true;
  return (
    document.documentElement.classList.contains('reduced-motion') ||
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  );
}

/**
 * The medal ceremony: the disc drops in once the tally has counted up, rays turning behind it.
 * Decorative (the stamp and the summary say the same in words), so it is hidden from readers.
 */
export function MedalCeremony({ award }: { award: Award }) {
  const [face, rim] = toneOf(award.tone);
  return (
    <div className={`medal-ceremony ${award.tone}`} aria-hidden="true">
      <svg viewBox="-60 -60 120 120">
        <g className="medal-rays">
          {!stillness() && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="14s"
              repeatCount="indefinite"
            />
          )}
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M0,-6 L4,-58 L-4,-58 Z"
              transform={`rotate(${i * 30})`}
              fill={face}
              opacity={0.35}
            />
          ))}
        </g>
        <g className="medal-disc">
          <path d="M-14,20 L-22,58 L0,48 L22,58 L14,20 Z" fill={rim} />
          <circle r={34} fill={rim} />
          <circle r={28} fill={face} />
          <path
            d="M0,-16 L4.7,-6.5 L15.2,-4.9 L7.6,2.5 L9.4,13 L0,8 L-9.4,13 L-7.6,2.5 L-15.2,-4.9 L-4.7,-6.5 Z"
            fill={rim}
          />
        </g>
      </svg>
    </div>
  );
}

/** Draws the shareable card: the field, the way it was played, the medal and its line. */
export function drawShareCard(
  canvas: HTMLCanvasElement,
  { field, mode, award, date }: { field: string; mode: string; award: Award | null; date: string },
): void {
  const width = 1200;
  const height = 630;
  canvas.width = width;
  canvas.height = height;
  const pen = canvas.getContext('2d');
  if (!pen) return;
  const sky = pen.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#35523a');
  sky.addColorStop(1, '#1b2a22');
  pen.fillStyle = sky;
  pen.fillRect(0, 0, width, height);
  // Grass along the bottom, in tufts.
  pen.fillStyle = '#26402c';
  for (let x = 0; x < width; x += 18) {
    const tall = 40 + ((x * 37) % 50);
    pen.beginPath();
    pen.moveTo(x, height);
    pen.lineTo(x + 9, height - tall);
    pen.lineTo(x + 18, height);
    pen.fill();
  }
  pen.fillStyle = '#ffb347';
  pen.font = '700 30px system-ui, sans-serif';
  pen.fillText('DANDORI ACADEMY', 70, 96);
  pen.fillStyle = '#fff6dc';
  pen.font = '800 72px system-ui, sans-serif';
  pen.fillText(field, 70, 200, 700);
  pen.font = '500 36px system-ui, sans-serif';
  pen.fillStyle = 'rgba(255, 246, 220, 0.8)';
  pen.fillText(mode, 70, 256, 700);
  if (award) {
    const [face, rim] = toneOf(award.tone);
    const cx = 960;
    const cy = 270;
    pen.fillStyle = rim;
    pen.beginPath();
    pen.arc(cx, cy, 150, 0, Math.PI * 2);
    pen.fill();
    pen.fillStyle = face;
    pen.beginPath();
    pen.arc(cx, cy, 124, 0, Math.PI * 2);
    pen.fill();
    pen.fillStyle = '#2a1a08';
    pen.textAlign = 'center';
    pen.font = '800 44px system-ui, sans-serif';
    pen.fillText(award.medal, cx, cy + 16, 220);
    pen.textAlign = 'left';
    pen.fillStyle = '#fff6dc';
    pen.font = '700 52px system-ui, sans-serif';
    pen.fillText(award.line, 70, 380, 700);
  }
  pen.fillStyle = 'rgba(255, 246, 220, 0.6)';
  pen.font = '500 26px system-ui, sans-serif';
  pen.fillText(date, 70, 450);
}

/** Makes the card and hands it over: the share sheet where there is one, else a download. */
export function ShareCardButton({
  result,
  level,
  fieldName,
}: {
  result: DayResult;
  level: LevelDefinition;
  fieldName: string;
}) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const share = async () => {
    const canvas = document.createElement('canvas');
    drawShareCard(canvas, {
      field: fieldName,
      mode: result.mode === 'campaign' ? 'Story' : MODES[result.mode].name,
      award: awardFor(result, level),
      date: new Date().toLocaleDateString(),
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      setState('failed');
      return;
    }
    const name = `dandori-${level.id}.png`;
    try {
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Dandori Academy: ${fieldName}` });
        setState('done');
        return;
      }
    } catch {
      // Share sheet dismissed or missing: fall back to a download.
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setState('done');
  };
  return (
    <button type="button" className="secondary small share-card" onClick={() => void share()}>
      {state === 'done'
        ? 'Card saved'
        : state === 'failed'
          ? 'Could not make the card'
          : 'Share a card'}
    </button>
  );
}
