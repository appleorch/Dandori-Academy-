import { beforeAll, describe, expect, it } from 'vitest';
import { penaltyPerLoss } from '../core/difficulty';
import { evaluateDay } from '../dandori/scoring';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { forDifficulty, LEVELS, shardCount, treasureTotal } from '../world/level';
import { playGreedy } from '../world/testBot';
import {
  entryOf,
  fetchBoard,
  standings,
  submitUrl,
  TITLE_PREFIX,
  type Fetcher,
  type GitHubIssue,
} from './board';
import { checkRun, decodeRun, encodeRun, fingerprint, makeRun, type RunEntry } from './runCode';

const LESSON = LEVELS[0];

/** A clean Platinum-pace day on the first lesson, as `finishDay` would write it. */
function sampleRun(overrides: Partial<{ elapsed: number; lost: number; alive: number }> = {}) {
  const elapsed = overrides.elapsed ?? LESSON.platinumTime - 2.37;
  const alive = overrides.alive ?? LESSON.startingWorkers;
  const lost = overrides.lost ?? 0;
  const timeLeft = LESSON.dayLength - elapsed;
  const score = evaluateDay(
    {
      treasureValue: treasureTotal(LESSON),
      treasuresCollected: shardCount(LESSON),
      treasuresTotal: shardCount(LESSON),
      timeLeft,
      workersAlive: alive,
      workersLost: lost,
    },
    LESSON,
  );
  const run = makeRun(
    {
      levelId: LESSON.id,
      difficulty: 'normal',
      score,
      shards: shardCount(LESSON),
      shardsTotal: shardCount(LESSON),
      elapsed,
      timeLeft,
      alive,
      lost,
    },
    '0.16.0',
    new Date('2026-11-18T12:00:00Z'),
  );
  if (!run) throw new Error('no run');
  return run;
}

async function issue(run: RunEntry, login: string, extra: Partial<GitHubIssue> = {}) {
  const url = new URL(submitUrl(run, await encodeRun(run)));
  return {
    title: url.searchParams.get('title') ?? '',
    body: url.searchParams.get('body'),
    html_url: `https://github.com/x/y/issues/${login}`,
    user: { login },
    labels: [],
    ...extra,
  } satisfies GitHubIssue;
}

beforeAll(async () => {
  await initPhysics();
});

describe('run codes', () => {
  it('round-trip a run exactly', async () => {
    const run = sampleRun();
    expect(await decodeRun(await encodeRun(run))).toEqual(run);
  });

  it('reject a code whose run was edited', async () => {
    const run = sampleRun();
    const code = await encodeRun(run);
    const [body, signature] = code.split('.');
    const forged = btoa(
      atob(body.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((body.length + 3) % 4)).replace(
        '"score":',
        '"score":9',
      ),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(await decodeRun(`${forged}.${signature}`)).toBeNull();
    expect(await decodeRun(`${body}.${'0'.repeat(64)}`)).toBeNull();
    expect(await decodeRun('not a code')).toBeNull();
  });
});

describe('checkRun', () => {
  it('accepts a day scored by the game', () => {
    expect(checkRun(sampleRun())).toBeNull();
    expect(checkRun(sampleRun({ lost: 3, alive: LESSON.startingWorkers - 3 }))).toBeNull();
  });

  it('accepts a real day played by the test bot, on Normal and on Hard', () => {
    for (const difficulty of ['normal', 'hard'] as const) {
      const level = forDifficulty(LESSON, difficulty);
      const sim = new Simulation(level);
      playGreedy(sim);
      const score = evaluateDay(
        {
          treasureValue: sim.stats.treasureValue,
          treasuresCollected: sim.stats.treasuresCollected.length,
          treasuresTotal: sim.stats.treasuresTotal,
          timeLeft: sim.timeLeft,
          workersAlive: sim.workers.size,
          workersLost: sim.stats.workersLost,
        },
        level,
        penaltyPerLoss(difficulty),
      );
      const run = makeRun(
        {
          levelId: level.id,
          difficulty,
          score,
          shards: sim.stats.treasuresCollected.length,
          shardsTotal: sim.stats.treasuresTotal,
          elapsed: sim.elapsed,
          timeLeft: sim.timeLeft,
          alive: sim.workers.size,
          lost: sim.stats.workersLost,
        },
        'test',
        new Date(),
      );
      expect(run).not.toBeNull();
      if (run) expect(checkRun(run)).toBeNull();
      sim.dispose();
    }
  });

  it('rejects runs that do not add up', () => {
    const run = sampleRun();
    expect(checkRun({ ...run, score: run.score + 10 })).toMatch(/score/);
    expect(checkRun({ ...run, treasure: run.treasure + 1, score: run.score + 1 })).toBeNull();
    expect(checkRun({ ...run, rank: 'Diamond' })).toMatch(/rank/);
    expect(checkRun({ ...run, timeBonus: run.timeBonus + 10 })).toMatch(/time bonus/);
    expect(checkRun({ ...run, timeLeft: run.timeLeft + 5 })).toMatch(/clock/);
    expect(checkRun({ ...run, alive: run.alive + 1 })).toMatch(/survivor/);
    expect(checkRun({ ...run, lost: 1 })).toMatch(/loss/);
    expect(checkRun({ ...run, shards: run.shardsTotal + 1 })).toMatch(/Sunshards/);
    expect(checkRun({ ...run, print: '0000000000000000' })).toMatch(/version/);
    expect(checkRun({ ...run, level: 'nowhere' })).toMatch(/unknown/);
    expect(checkRun({ ...run, score: -5 })).toMatch(/malformed/);
  });

  it('rejects a clear faster than anyone could manage', () => {
    expect(checkRun(sampleRun({ elapsed: LESSON.diamondTime * 0.4 }))).toMatch(/faster/);
  });

  it('fingerprints each lesson and difficulty differently', () => {
    const prints = new Set(
      LEVELS.flatMap((level) => [fingerprint(level), fingerprint(forDifficulty(level, 'hard'))]),
    );
    expect(prints.size).toBe(LEVELS.length * 2);
  });
});

describe('the board', () => {
  it('pre-fills an issue a person can submit as it is', async () => {
    const run = sampleRun();
    const url = new URL(submitUrl(run, await encodeRun(run)));
    expect(url.origin + url.pathname).toBe(
      'https://github.com/appleorch/Dandori-Academy-/issues/new',
    );
    expect(url.searchParams.get('title')).toMatch(new RegExp(`^\\${TITLE_PREFIX} ${LESSON.name}`));
    expect(url.toString().length).toBeLessThan(6000);
    expect(await entryOf(await issue(run, 'ada'))).toMatchObject({
      player: 'ada',
      score: run.score,
    });
  });

  it('ignores pull requests, struck entries, other issues and edited codes', async () => {
    const run = sampleRun();
    expect(await entryOf(await issue(run, 'a', { pull_request: {} }))).toBeNull();
    expect(await entryOf(await issue(run, 'a', { labels: [{ name: 'Rejected' }] }))).toBeNull();
    expect(await entryOf(await issue(run, 'a', { title: 'Bug: the Kiln' }))).toBeNull();
    const posted = await issue(run, 'a');
    expect(
      await entryOf({ ...posted, body: posted.body?.replace(/\.[0-9a-f]{8}/, '.00000000') }),
    ).toBeNull();
  });

  it('ranks each Warden by their best run, best first', async () => {
    const fastest = sampleRun({ elapsed: LESSON.platinumTime - 6 });
    const fast = sampleRun({ elapsed: LESSON.platinumTime - 5 });
    const slow = sampleRun({ elapsed: LESSON.platinumTime + 4 });
    const issues = [
      await issue(slow, 'bo'),
      await issue(fast, 'bo'),
      await issue(slow, 'cy'),
      await issue(fastest, 'ada'),
    ];
    const entries = (await Promise.all(issues.map(entryOf))).filter((entry) => entry !== null);
    const board = standings(entries, LESSON.id, 'normal');
    expect(board.map((entry) => entry.player)).toEqual(['ada', 'bo', 'cy']);
    expect(board[1].score).toBe(fast.score);
    expect(board[2].score).toBe(slow.score);
    expect(standings(entries, LESSON.id, 'hard')).toEqual([]);
  });

  it('reads every page from GitHub and explains a rate limit', async () => {
    const run = sampleRun();
    const full = await Promise.all(Array.from({ length: 100 }, (_, i) => issue(run, `p${i}`)));
    const rest = [await issue(run, 'last')];
    const pages: string[] = [];
    const fetcher: Fetcher = async (url) => {
      pages.push(url);
      return { ok: true, status: 200, json: async () => (url.endsWith('page=1') ? full : rest) };
    };
    const entries = await fetchBoard(fetcher);
    expect(entries).toHaveLength(101);
    expect(pages).toHaveLength(2);
    const limited: Fetcher = async () => ({ ok: false, status: 403, json: async () => ({}) });
    await expect(fetchBoard(limited)).rejects.toThrow(/limiting/);
  });
});
