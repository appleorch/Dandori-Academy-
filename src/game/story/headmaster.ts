import type { SimEvent } from '../simulation/events';
import type { Simulation } from '../simulation/Simulation';
import type { Rank } from '../dandori/scoring';
import type { Relic } from './relics';

/**
 * Headmaster Professor Sprocket, of the Grand Botanical & Clockwork Academy: a small,
 * excitable man in a top hat with a clock in it, who watches every examination from the
 * gallery and cannot keep quiet about any of it. Proctor Ashwick briefs and advises;
 * the Headmaster cheers, frets and pronounces.
 *
 * The commentator turns what happens in a day into the odd line of his. It never changes
 * the simulation. Lines are rate-limited so he stays a character, not a ticker.
 */

export type Mood = 'cheer' | 'alarm' | 'muse';

export interface Line {
  text: string;
  mood: Mood;
}

/** Quiet time after a line before another ordinary one; alarms may cut in sooner. */
const GAP = 9;
const ALARM_GAP = 3;
/** Losses this close together count as a disaster. */
const LOSS_WINDOW = 5;

const pick = <T>(items: readonly T[], seed: number): T =>
  items[Math.abs(Math.floor(seed)) % items.length];

const OPENERS: readonly string[] = [
  'Places, cadet! The clock is wound and the Kiln is hungry. Marvellous!',
  'Ah, {lesson}! I designed this one myself. Mostly. Begin!',
  'Pencils down, whistles up! {lesson} begins now!',
  'Mind the plants, mind the Emberlings, mind the time. In that order. Off you go!',
  'A fine day for an examination. Every day is, if you ask me. Nobody does.',
];

/** The Curriculum examinations each get their own opening. */
const EXAM_OPENERS: Record<string, string> = {
  'terrace-gardens':
    'The Terrace Gardens! Throw them up, bring it down. Ramps, cadet, ramps! Splendid things.',
  'the-long-drop':
    'The Long Drop! A long walk up, a short fall down. Gravity is on our staff, you know.',
  'crystal-conservatory':
    'The Conservatory! Those crystal doors were grown, not built. Break them with feeling!',
  'clockwork-causeway':
    'The Causeway! The sprinkler keeps perfect time. I should know, I wound it. Badly.',
  'restoration-day':
    'Restoration Day! Every relic home and the Academy is whole. No pressure. Enormous pressure.',
};

const CHAIN_LINES: Record<number, readonly string[]> = {
  3: ['Three in a row! That’s dandori, that is!', 'One, two, three! Like clockwork!'],
  5: ['Five! FIVE! Somebody write this down!', 'A five-chain! I may need to sit down.'],
  8: ['Eight in a row! I have not seen that since the founders!', 'Eight! The Kiln is singing!'],
};

const RELIC_LINES: readonly string[] = [
  'The {relic}! I wondered where that had got to.',
  'Is that the {relic}? Into the cabinet with it!',
  'The {relic}, home at last. Marvellous!',
];

const RARE_RELIC_LINES: readonly string[] = [
  'The {relic}! Carefully, carefully, CAREFULLY!',
  'Ohh, the {relic}. Mind the edges, it bites.',
];

const EVENT_LINES: Partial<Record<SimEvent['type'], readonly Line[]>> = {
  bridgeBuilt: [
    { text: 'A bridge! Built by hand and stubbornness. My two favourite tools.', mood: 'cheer' },
  ],
  gateBroken: [
    { text: 'Through the gate! Somebody fetch a broom. And a gardener.', mood: 'cheer' },
  ],
  beaconLit: [{ text: 'A light in the old place! Hauls nearby can stop there now.', mood: 'muse' }],
  shieldDown: [{ text: 'Its shield is down! Now, now, NOW!', mood: 'alarm' }],
  phase: [{ text: 'It’s angry now. I would also be angry. Stay out of the rings!', mood: 'alarm' }],
  bloom: [{ text: 'A Glowcap! They don’t keep, cadet. Hop to it!', mood: 'cheer' }],
  wilt: [{ text: 'Oh, it wilted. Never mind. I mind a little.', mood: 'muse' }],
  sap: [{ text: 'Sap in the Kiln! Everybody carries faster. Faster! Go!', mood: 'cheer' }],
  twin: [
    { text: 'Both twins together! Harmony! That’s the whole point of the place!', mood: 'cheer' },
  ],
  crack: [{ text: 'Was that a crack? Tell me that was not a crack.', mood: 'alarm' }],
  captainHurt: [{ text: 'Warden! Are you all right? Do not answer, keep moving!', mood: 'alarm' }],
};

/** What he has to say at the end of a day, by rank. */
const EVALUATIONS: Record<Rank, readonly string[]> = {
  Platinum: [
    'Platinum! I’m having it engraved. On something. Possibly you.',
    'Flawless dandori. The founders would weep. I am weeping. It is fine.',
  ],
  Gold: [
    'Gold! A proper Warden’s day. Shave a little off the walk home and it’s Platinum.',
    'Splendid! Golden! Nearly perfect, which is the best kind of nearly.',
  ],
  Silver: [
    'Silver. Respectable! Next time, fewer idle hands and more hauls in the air.',
    'A pass, and a good one. I saw some dawdling. I always see the dawdling.',
  ],
  Bronze: [
    'Bronze. Well. Everyone has a Bronze day. I had eleven in a row once.',
    'Hmm. Plan the order before you start, cadet. The clock does not wait for anyone.',
  ],
};

/** The Headmaster's verdict on a finished day. */
export function evaluation(rank: Rank, levelId: string): string {
  let seed = 0;
  for (const char of levelId) seed += char.charCodeAt(0);
  return pick(EVALUATIONS[rank], seed);
}

export class Headmaster {
  private quiet = 0;
  private spoke = false;
  private readonly losses: number[] = [];
  private readonly said = new Set<string>();
  private pending: Line | null = null;
  private counter = 0;

  constructor(private readonly sim: Simulation) {}

  private offer(line: Line, key?: string): void {
    if (key) {
      if (this.said.has(key)) return;
      this.said.add(key);
    }
    // An alarm replaces anything else waiting; otherwise the first line offered stands.
    if (!this.pending || (line.mood === 'alarm' && this.pending.mood !== 'alarm'))
      this.pending = line;
  }

  /** A relic has come home. Fragile and heavy ones get remarked on more often. */
  relic(relic: Relic): void {
    this.counter++;
    const rare =
      relic.material === 'glass' || relic.material === 'porcelain' || relic.material === 'iron';
    if (!rare && this.counter % 3 !== 1) return;
    const lines = rare ? RARE_RELIC_LINES : RELIC_LINES;
    this.offer({ text: pick(lines, this.counter).replace('{relic}', relic.name), mood: 'cheer' });
  }

  /** Reacts to the step's events: chains, milestones, disasters. */
  events(events: readonly SimEvent[]): void {
    const sim = this.sim;
    for (const event of events) {
      if (event.type === 'chain') {
        const lines = CHAIN_LINES[event.amount];
        if (lines) this.offer({ text: pick(lines, sim.tick), mood: 'cheer' });
      } else if (event.type === 'workerLost') {
        this.losses.push(sim.elapsed);
      } else if (event.type === 'enemyDefeated' && sim.stats.bossesDefeated.length > 0) {
        this.offer(
          { text: 'It’s down! The beast is down! Collect what it dropped!', mood: 'cheer' },
          'boss-down',
        );
      } else {
        const lines = EVENT_LINES[event.type];
        if (lines)
          this.offer(
            pick(lines, sim.tick),
            event.type === 'captainHurt'
              ? undefined
              : `once-${event.type}-${Math.floor(sim.elapsed / 60)}`,
          );
      }
    }
    while (this.losses.length > 0 && sim.elapsed - this.losses[0] > LOSS_WINDOW)
      this.losses.shift();
    if (this.losses.length >= 3) {
      this.offer({ text: 'We’re losing them! Whistle them back! WHISTLE!', mood: 'alarm' });
      this.losses.length = 0;
    }
  }

  /** Advances his patience by `dt` seconds; returns a line when he has something to say. */
  update(dt: number): Line | null {
    const sim = this.sim;
    if (!this.spoke) {
      this.spoke = true;
      const exam = EXAM_OPENERS[sim.level.id];
      return {
        text: exam ?? pick(OPENERS, sim.level.seed).replace('{lesson}', sim.level.name),
        mood: 'cheer',
      };
    }
    if (sim.timeLeft <= 30 && sim.timeLeft > 29 && sim.level.dayLength > 120) {
      this.offer(
        { text: 'Thirty seconds! Bring it home, bring it ALL home!', mood: 'alarm' },
        'last-call',
      );
    }
    const halfway = sim.stats.treasuresCollected.length * 2 >= sim.stats.treasuresTotal;
    if (halfway && sim.stats.treasuresTotal >= 6) {
      this.offer(
        { text: 'Halfway there! The Kiln is warming up nicely.', mood: 'muse' },
        'halfway',
      );
    }
    this.quiet += dt;
    const line = this.pending;
    if (!line) return null;
    if (this.quiet < (line.mood === 'alarm' ? ALARM_GAP : GAP)) return null;
    this.pending = null;
    this.quiet = 0;
    return line;
  }
}
