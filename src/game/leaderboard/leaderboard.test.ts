import { beforeAll, describe, expect, it } from 'vitest';
import { penaltyPerLoss } from '../core/difficulty';
import { evaluateDay } from '../dandori/scoring';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { forDifficulty, LEVELS, shardCount, treasureTotal } from '../world/level';
import { playGreedy } from '../world/testBot';
import {
  BOARD_FILE_URL,
  BOARD_TOPIC,
  checkPosts,
  entryOf,
  BOARD_API,
  fetchBoard,
  keepBest,
  KEPT_PER_LESSON,
  nextBoardFile,
  parseBoardFile,
  parseRelay,
  relayMessage,
  RELAY,
  sendPost,
  standings,
  type Fetcher,
} from './board';
import oldBoard from './fixtures/board-0.17.0.json';
import { challengeFacts } from '../modes/facts';
import { MODES, scoreChallenge } from '../modes/modes';
import {
  checkRun,
  decodePost,
  decodeRun,
  encodePost,
  encodeRun,
  fingerprint,
  makeChallengeRun,
  makeRun,
  playedOnThisLesson,
  playPrint,
  type BoardPost,
  type RunEntry,
} from './runCode';

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
      glowcapPoints: 0,
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

const ADA = 'a1a1a1a1a1a1a1a1';
const BO = 'b2b2b2b2b2b2b2b2';
const CY = 'c3c3c3c3c3c3c3c3';

function post(run: RunEntry, player = ADA, name = 'Ada'): BoardPost {
  return { v: 1, player, name, run };
}

/** A relay's poll answer holding these posts, one JSON event per line, with a stray message. */
async function relayAnswer(posts: BoardPost[]): Promise<string> {
  const lines = [JSON.stringify({ id: 'x', event: 'open', topic: BOARD_TOPIC })];
  for (const item of posts) {
    lines.push(
      JSON.stringify({
        id: Math.random().toString(36).slice(2),
        event: 'message',
        topic: BOARD_TOPIC,
        message: relayMessage(await encodePost(item)),
      }),
    );
  }
  lines.push(JSON.stringify({ id: 'y', event: 'message', topic: BOARD_TOPIC, message: 'hello' }));
  return `${lines.join('\n')}\n`;
}

function respond(status: number, body = ''): ReturnType<Fetcher> {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => body });
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
          glowcapPoints: sim.stats.bonus.glowcapPoints,
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
    expect(checkRun({ ...run, glowcaps: 99999, treasure: 99999 + run.treasure })).toMatch(
      /Glowcaps|treasure/,
    );
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

describe('board posts', () => {
  it('round-trip a post exactly, and refuse an edited one', async () => {
    const item = post(sampleRun());
    const code = await encodePost(item);
    expect(await decodePost(code)).toEqual(item);
    const [body, signature] = code.split('.');
    expect(await decodePost(`${body}x.${signature}`)).toBeNull();
    // A plain run code is not a post.
    expect(await decodePost(await encodeRun(item.run))).toBeNull();
  });

  it('only shows names the board allows, and runs that add up', async () => {
    expect(await entryOf(await encodePost(post(sampleRun())))).toMatchObject({ name: 'Ada' });
    expect(await entryOf(await encodePost(post(sampleRun(), ADA, '<script>')))).toBeNull();
    expect(await entryOf(await encodePost(post(sampleRun(), ADA, '  ')))).toBeNull();
    const bad = { ...sampleRun(), score: 99999 };
    expect(await entryOf(await encodePost(post(bad)))).toBeNull();
  });

  it('reads runs from the relay and ignores everything else on the topic', async () => {
    const codes = parseRelay(await relayAnswer([post(sampleRun()), post(sampleRun(), BO, 'Bo')]));
    expect(codes).toHaveLength(2);
    expect(parseRelay('not json\n{"event":"keepalive"}\n')).toEqual([]);
  });

  it('posts the signed run to the board server, and to the relay when the server is away', async () => {
    const sent: { url: string; body?: string }[] = [];
    const serverUp: Fetcher = (url, init) => {
      sent.push({ url, body: init?.body });
      return respond(200, '{"result":"kept"}');
    };
    expect(await sendPost(post(sampleRun()), serverUp)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe(`${BOARD_API}/runs`);
    const { code } = JSON.parse(sent[0].body ?? '{}') as { code: string };
    expect(await entryOf(code)).toMatchObject({ name: 'Ada' });

    // A run the server refuses is never tried again.
    expect(await sendPost(post(sampleRun()), () => respond(422))).toBe(true);

    sent.length = 0;
    const serverDown: Fetcher = (url, init) => {
      sent.push({ url, body: init?.body });
      return url.startsWith(BOARD_API) ? Promise.reject(new Error('down')) : respond(200, '{}');
    };
    expect(await sendPost(post(sampleRun()), serverDown)).toBe(true);
    expect(sent[1].url).toBe(`${RELAY}/${BOARD_TOPIC}`);
    expect(parseRelay(JSON.stringify({ event: 'message', message: sent[1].body }))).toHaveLength(1);
    expect(await sendPost(post(sampleRun()), () => respond(429))).toBe(false);
    expect(await sendPost(post(sampleRun()), () => Promise.reject(new Error('offline')))).toBe(
      false,
    );
  });
});

describe('challenge runs', () => {
  /** A Treasure Hunt on the first lesson, played by the test player, written as the game does. */
  function huntRun(): RunEntry {
    const sim = new Simulation(LESSON, { endsWhen: MODES.hunt.endsWhen, growth: true });
    playGreedy(sim);
    const facts = challengeFacts(sim);
    const score = scoreChallenge('hunt', LESSON, facts);
    const run = makeChallengeRun(
      {
        levelId: LESSON.id,
        difficulty: 'normal',
        mode: 'hunt',
        facts,
        score,
        elapsed: sim.elapsed,
      },
      '0.18.0',
      new Date('2026-11-23T12:00:00Z'),
    );
    sim.dispose();
    if (!run) throw new Error('no run');
    return run;
  }

  it('checks out when honest, and not when its score or medal is touched', () => {
    const run = huntRun();
    expect(checkRun(run)).toBeNull();
    expect(checkRun({ ...run, score: run.score + 1 })).not.toBeNull();
    expect(checkRun({ ...run, rank: 'Diamond' })).not.toBeNull();
    expect(checkRun({ ...run, glowcaps: run.treasure + 1 })).not.toBeNull();
  });

  it('goes on its own challenge board, apart from the Classic board and the other challenges', async () => {
    const hunt = huntRun();
    const classic = sampleRun();
    const entries = await checkPosts(
      await Promise.all([post(hunt), post(classic)].map(encodePost)),
    );
    expect(standings(entries, LESSON.id, 'normal', 'hunt').map((e) => e.mode)).toEqual(['hunt']);
    expect(standings(entries, LESSON.id, 'normal').map((e) => e.mode)).toEqual([undefined]);
    expect(standings(entries, LESSON.id, 'normal', 'mission')).toEqual([]);
  });
});

describe('the board', () => {
  it('ranks each Warden by their best run, and tells Wardens with one name apart', async () => {
    const fastest = sampleRun({ elapsed: LESSON.platinumTime - 6 });
    const fast = sampleRun({ elapsed: LESSON.platinumTime - 5 });
    const slow = sampleRun({ elapsed: LESSON.platinumTime + 4 });
    const entries = await checkPosts(
      await Promise.all(
        [post(slow, BO, 'Bo'), post(fast, BO, 'Bo'), post(slow, CY, 'Ada'), post(fastest)].map(
          encodePost,
        ),
      ),
    );
    const board = standings(entries, LESSON.id, 'normal');
    expect(board.map((entry) => entry.player)).toEqual([ADA, BO, CY]);
    expect(board[1].score).toBe(fast.score);
    expect(standings(entries, LESSON.id, 'hard')).toEqual([]);
  });

  it('keeps at most one run per Warden and a hundred per lesson', async () => {
    const run = sampleRun();
    const codes = await Promise.all(
      Array.from({ length: KEPT_PER_LESSON + 5 }, (_, i) =>
        encodePost(post(run, i.toString(16).padStart(16, '0'), `W${i}`)),
      ),
    );
    const kept = keepBest(await checkPosts([...codes, ...codes]));
    expect(kept).toHaveLength(KEPT_PER_LESSON);
  });

  it('reads the board server, or the board file and the relay when it is away', async () => {
    const file = JSON.stringify({
      v: 1,
      updated: '',
      posts: [await encodePost(post(sampleRun()))],
    });
    const relay = await relayAnswer([post(sampleRun({ elapsed: 15 }), BO, 'Bo')]);
    const serverBoard = JSON.stringify({
      v: 1,
      updated: '',
      posts: [await encodePost(post(sampleRun())), await encodePost(post(sampleRun(), BO, 'Bo'))],
    });
    const server: Fetcher = (url) =>
      url === `${BOARD_API}/board` ? respond(200, serverBoard) : respond(500);
    const fromServer = await fetchBoard(server);
    expect(fromServer.entries.map((entry) => entry.player).sort()).toEqual([ADA, BO]);
    expect(fromServer).toMatchObject({ server: true });

    const down =
      (fetcher: Fetcher): Fetcher =>
      (url, init) =>
        url.startsWith(BOARD_API) ? respond(503) : fetcher(url, init);
    const both = down((url) => respond(200, url === BOARD_FILE_URL ? file : relay));
    const board = await fetchBoard(both);
    expect(board.entries.map((entry) => entry.player).sort()).toEqual([ADA, BO]);
    expect(board).toMatchObject({ server: false, file: true, relay: true });

    // Before the first run is collected the file is not there: that is an empty board.
    const noFile = down((url) => (url === BOARD_FILE_URL ? respond(404) : respond(200, relay)));
    expect((await fetchBoard(noFile)).entries).toHaveLength(1);

    const noRelay = down((url) => (url === BOARD_FILE_URL ? respond(200, file) : respond(503)));
    expect(await fetchBoard(noRelay)).toMatchObject({ file: true, relay: false });

    await expect(fetchBoard(() => respond(500))).rejects.toThrow(/could not be reached/);
  });

  it('collects the relay into the next board file, leaving out the banned and the fake', async () => {
    const kept = [await encodePost(post(sampleRun({ elapsed: 19 })))];
    const incoming = [
      await encodePost(post(sampleRun({ elapsed: 16 }))),
      await encodePost(post(sampleRun(), BO, 'Bo')),
      await encodePost(post({ ...sampleRun(), score: 1 }, CY, 'Cy')),
      'not a code',
    ];
    const now = new Date('2026-11-19T00:00:00Z');
    const next = await nextBoardFile(kept, incoming, new Set([BO]), now);
    expect(next.updated).toBe(now.toISOString());
    expect(next.posts).toHaveLength(1);
    const [only] = await checkPosts(next.posts);
    expect(only.player).toBe(ADA);
    expect(only.time).toBeCloseTo(16);
    // Collecting again changes nothing.
    expect((await nextBoardFile(next.posts, incoming, new Set([BO]), now)).posts).toEqual(
      next.posts,
    );
  });
});

describe('runs from 0.17.0', () => {
  // The board as it stood when Glowcaps stopped counting towards the rank: real runs, kept.
  const OLD_BOARD = parseBoardFile(JSON.stringify(oldBoard));

  it('are all still accepted, with the ranks they were given', async () => {
    expect(OLD_BOARD.length).toBe(13);
    const entries = await checkPosts(OLD_BOARD);
    expect(entries).toHaveLength(OLD_BOARD.length);
    for (const entry of entries) {
      expect(entry.glowcaps).toBeUndefined();
      expect(playedOnThisLesson(entry)).toBe(true);
    }
    expect(entries.filter((entry) => entry.rank === 'Diamond').length).toBe(10);
  });

  it('are still refused if edited', async () => {
    const [first] = await checkPosts(OLD_BOARD);
    // The run itself, as the player's game posted it: checkRun looks at nothing else.
    const run = first;
    expect(checkRun(run)).toBeNull();
    expect(checkRun({ ...run, score: run.score + 500 })).toMatch(/score/);
    expect(checkRun({ ...run, rank: 'Copper' })).toMatch(/rank/);
    expect(checkRun({ ...run, print: '0000000000000000' })).toMatch(/version/);
  });
});

describe('lesson fingerprints', () => {
  it('ignore a lesson\u2019s words and rank targets, and see any change to how it plays', () => {
    const base = playPrint(LESSON);
    expect(playPrint({ ...LESSON, brief: 'New words', name: 'New name' })).toBe(base);
    expect(playPrint({ ...LESSON, platinumTime: 99, parScore: 1, diamondScore: 2 })).toBe(base);
    const moved = LESSON.treasures.map((shard, i) =>
      i === 0 ? { ...shard, x: shard.x + 1 } : shard,
    );
    expect(playPrint({ ...LESSON, treasures: moved })).not.toBe(base);
    expect(playPrint({ ...LESSON, dayLength: LESSON.dayLength + 1 })).not.toBe(base);
  });

  it('tell every lesson and difficulty apart', () => {
    const prints = new Set(
      LEVELS.flatMap((level) => [playPrint(level), playPrint(forDifficulty(level, 'hard'))]),
    );
    expect(prints.size).toBe(LEVELS.length * 2);
  });

  it('rank new runs without their Glowcaps', () => {
    const run = sampleRun();
    expect(run.glowcaps).toBe(0);
    // Claiming Glowcaps the lesson never grew is refused.
    expect(
      checkRun({
        ...run,
        glowcaps: 10000,
        treasure: run.treasure + 10000,
        score: run.score + 10000,
      }),
    ).toMatch(/Glowcaps|treasure/);
  });
});
