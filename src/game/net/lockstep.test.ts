import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { Battle, levelForMode } from '../modes/battle';
import { MODES, type BattleId } from '../modes/modes';
import { greedyPlayer } from '../world/testBot';
import { LEVELS } from '../world/level';
import { NO_INPUT } from '../commands/input';
import { battleHash, Lockstep, type NetMessage, type Transport } from './lockstep';

beforeAll(async () => {
  await initPhysics();
});

/** Two ends of a wire whose messages take `latency` pumps to arrive, and can be jittered. */
function wire(latency: number, jitter = 0) {
  const queue: { to: 0 | 1; at: number; message: NetMessage }[] = [];
  let now = 0;
  let seed = 7;
  const ends: Transport[] = [0, 1].map((side) => ({
    onMessage: null,
    send(message: NetMessage) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const extra = jitter > 0 ? seed % (jitter + 1) : 0;
      // A message never overtakes an earlier one on the same channel (it is ordered).
      const last = queue.filter((q) => q.to === 1 - side).reduce((m, q) => Math.max(m, q.at), 0);
      queue.push({
        to: (1 - side) as 0 | 1,
        at: Math.max(last, now + latency + extra),
        message: JSON.parse(JSON.stringify(message)) as NetMessage,
      });
    },
    close() {},
  }));
  const pump = () => {
    now++;
    for (let i = 0; i < queue.length;) {
      if (queue[i].at <= now) {
        const [item] = queue.splice(i, 1);
        ends[item.to].onMessage?.(item.message);
      } else i++;
    }
  };
  return { ends, pump };
}

/** One browser in an online battle: its own field, the other's, and the lockstep between. */
function peer(mode: BattleId, transport: Transport, host: boolean) {
  const level = levelForMode(LEVELS[2], mode);
  const spec = MODES[mode];
  const mine = new Simulation(level, { endsWhen: spec.endsWhen, growth: spec.growth });
  const battle = new Battle(mode, level, 'normal', { host });
  const lockstep = new Lockstep(transport);
  const player = greedyPlayer(mine);
  let frames = 0;
  return {
    mine,
    battle,
    lockstep,
    /** One frame: try to play a step, as the game loop does. */
    frame() {
      if (mine.ended) return;
      lockstep.submit(player.input(frames++));
      if (!lockstep.ready()) return;
      const { mine: ours, theirs } = lockstep.take();
      mine.step(ours);
      battle.stepRival(theirs);
      lockstep.check(() =>
        host ? battleHash(mine, battle.rival) : battleHash(battle.rival, mine),
      );
    },
  };
}

describe('online battles in lockstep', () => {
  for (const [mode, latency, jitter] of [
    ['duel', 3, 0],
    ['marble', 9, 4],
  ] as const) {
    it(`plays a ${mode} the same on both sides over a ${latency}-step wire`, () => {
      const { ends, pump } = wire(latency, jitter);
      const host = peer(mode, ends[0], true);
      const guest = peer(mode, ends[1], false);
      let decided: [string | null, string | null] = [null, null];
      for (let i = 0; i < 60 * 90 && !(decided[0] && decided[1]); i++) {
        host.frame();
        guest.frame();
        pump();
        decided = [
          decided[0] ?? host.battle.decide(host.mine)?.outcome ?? null,
          decided[1] ?? guest.battle.decide(guest.mine)?.outcome ?? null,
        ];
      }
      // Each side's field on its own screen matches the copy on the other's.
      expect(host.mine.tick).toBeGreaterThan(600);
      expect(host.lockstep.desync).toBeNull();
      expect(guest.lockstep.desync).toBeNull();
      // The two sides may be a step or two apart when the loop stops; bring them level.
      while (host.lockstep.step !== guest.lockstep.step) {
        pump();
        if (host.lockstep.step < guest.lockstep.step) host.frame();
        else guest.frame();
      }
      expect(battleHash(host.mine, host.battle.rival)).toBe(
        battleHash(guest.battle.rival, guest.mine),
      );
      // And the result agrees: one wins and the other loses, or both draw.
      const [a, b] = decided;
      if (a && b) {
        const pair = `${a}/${b}`;
        expect(['won/lost', 'lost/won', 'drawn/drawn']).toContain(pair);
      }
      host.mine.dispose();
      guest.mine.dispose();
      host.battle.dispose();
      guest.battle.dispose();
    });
  }

  it('waits for the other side, and notices when the two stop matching', () => {
    const { ends, pump } = wire(2);
    const a = new Lockstep(ends[0]);
    const b = new Lockstep(ends[1]);
    const idle = { ...NO_INPUT };
    // Before anything arrives, only the first steps (decided as nothing pressed) can be played.
    for (let i = 0; i < a.delay; i++) {
      a.submit(idle);
      expect(a.ready()).toBe(true);
      a.take();
    }
    a.submit(idle);
    expect(a.ready()).toBe(false);
    for (let i = 0; i < 400; i++) {
      for (const [side, drift] of [
        [a, 0],
        [b, 1],
      ] as const) {
        side.submit(idle);
        if (!side.ready()) continue;
        side.take();
        side.check(() => (side.step > 180 ? 10 + drift : 10));
      }
      pump();
    }
    expect(a.desync).not.toBeNull();
    expect(b.desync).not.toBeNull();
    expect(a.desync ?? 0).toBeGreaterThan(180);
  });
});
