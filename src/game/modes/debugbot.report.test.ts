import { beforeAll, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { levelById } from '../world/level';
import { playGreedy } from '../world/testBot';
import { MODES } from './modes';

/**
 * Not a test: a tool for building fields. `VITE_DEBUG_LEVEL=<field id> npx vitest run
 * src/game/modes/debugbot.report.test.ts --silent=false` plays the field with the test player
 * and prints what it is doing every five seconds, to see where it gets stuck.
 */
beforeAll(async () => {
  await initPhysics();
});

it.skipIf(!import.meta.env.VITE_DEBUG_LEVEL)(
  'debug',
  () => {
    const level = levelById(import.meta.env.VITE_DEBUG_LEVEL as string);
    if (!level) throw new Error('No such field');
    const mode = level.challenge?.mode ?? 'lessons';
    const sim = new Simulation(level, {
      endsWhen: MODES[mode].endsWhen,
      growth: MODES[mode].growth,
    });
    let last = '';
    playGreedy(sim, (tick, job) => {
      if (tick % 300 !== 0) return;
      const c = sim.carryables.get(job);
      const e = sim.enemies.get(job);
      const at = sim.transforms.get(job);
      const cap = sim.captainTransform;
      const line = `${(tick / 60).toFixed(0)}s cap=(${cap.x.toFixed(0)},${cap.z.toFixed(0)}) job=${c ? c.kind + ':' + c.id : e ? e.kind : 'none'}@${at ? `${at.x.toFixed(0)},${at.z.toFixed(0)}` : '-'} home=${sim.stats.treasuresCollected.length} alive=${sim.workers.size} ${JSON.stringify(sim.countWorkers())}`;
      if (line !== last) console.log(line);
      last = line;
    });
    console.log('ended', sim.ended, sim.elapsed);
  },
  600000,
);
