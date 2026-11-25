import { BOSS_RELICS, CLOCK_PARTS, type Relic } from './relics';

/**
 * Two notes on every Great Clock part and every boss's relic, as the genre's treasure logs
 * have: the Warden's (brief, practical, a little proud) and the Headmaster's (comic, evasive,
 * and now and then too honest about why the Clock stopped). Shown in the Field Guide once the
 * relic is home. Written from a few patterns per voice, chosen by the relic, so each reads as
 * its own.
 */
export interface RelicNotes {
  warden: string;
  sprocket: string;
}

const WARDEN: readonly ((r: Relic) => string)[] = [
  (r) => `${r.name}. Heavier than it looks. Tindle insisted on carrying the corner nobody needed.`,
  (r) =>
    `Took the squad most of a morning to get ${r.name.replace(/^The /, 'the ')} home. Worth every minute.`,
  (r) => `Found where Ashwick said it would be, give or take a beast. ${shapeLine(r)}`,
  (r) => `${r.name}: no scratches, which surprised everyone, the beast included.`,
  () => `The Kiln hummed when this came in. I am choosing to take that as approval.`,
  (r) => `Logged ${r.name.replace(/^The /, 'the ')}. Sproutlings sang the whole way back. Off key.`,
];

const SPROCKET: readonly ((r: Relic) => string)[] = [
  (r) =>
    `Ah, ${r.name.replace(/^The /, 'the ')}. I last saw it the night I tried to make the Clock run faster. Unrelated.`,
  () => `Polish it, Warden. Gently. It was not my fault it came loose. Mostly not.`,
  (r) => `${r.name}! I had wondered where that went. I had hoped no one else would wonder.`,
  () =>
    `The founders made this by hand. I once used it as a paperweight. We need not dwell on that.`,
  () =>
    `Put it with the others. If the Clock asks, I was nowhere near it on the night in question.`,
  (r) => `Splendid. ${materialLine(r)} Do not tell the Board of Governors how long it was missing.`,
];

function shapeLine(relic: Relic): string {
  switch (relic.shape) {
    case 'gear':
      return 'Every tooth intact.';
    case 'bell':
      return 'Rang once when it was set down, all on its own.';
    case 'key':
      return 'It is warm, as if someone has been holding it.';
    case 'crystal':
      return 'It throws little rainbows on the squad.';
    default:
      return 'The squad wanted to keep it.';
  }
}

function materialLine(relic: Relic): string {
  switch (relic.material) {
    case 'gold':
      return 'Gold, you know. Real gold.';
    case 'brass':
      return 'Good founders’ brass.';
    case 'glass':
    case 'crystal':
      return 'Do not drop it. I did, once.';
    default:
      return 'Solid workmanship.';
  }
}

function hash(text: string): number {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

/** The two notes on a part or a boss's relic; null for any other relic. */
export function relicNotes(relic: Relic): RelicNotes | null {
  const isPart = CLOCK_PARTS[relic.id] !== undefined;
  const isBoss = Object.values(BOSS_RELICS).some((boss) => boss.id === relic.id);
  if (!isPart && !isBoss) return null;
  const h = hash(relic.id);
  return {
    warden: WARDEN[h % WARDEN.length](relic),
    sprocket: SPROCKET[Math.floor(h / 7) % SPROCKET.length](relic),
  };
}
