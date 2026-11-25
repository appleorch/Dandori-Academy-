import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { audio } from '../audio/audioManager';
import type { Intensity } from '../audio/music';
import type { InputController } from '../commands/input';
import { assistAim, jobSpots } from '../commands/aimAssist';
import { connectedPads } from '../commands/gamepad';
import { FixedClock } from '../core/clock';
import { CAPTAIN, SIM_DT } from '../core/config';
import { useGameStore } from '../core/gameStore';
import { splitKey } from '../save/saveManager';
import { ENEMY_SPECS, type EnemyKind } from '../enemies/enemyKinds';
import type { Battle, BattleOutcome } from '../modes/battle';
import type { Expedition } from '../simulation/expedition';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import { Coach, spokenKey, type CoachControls } from '../story/coach';
import { padName } from '../commands/bindings';
import { useInputDevice } from '../commands/device';
import { Headmaster } from '../story/headmaster';
import { relicFor } from '../story/relics';
import type { Feedback } from './feedback';
import { recordSteps } from './perf';

/** Seconds between a carrying crew's chants, and how near the Warden one must be to hear it. */
const HEAVE_SECONDS = 1.1;
const HEAVE_RANGE = 16;
import { PLUCK_INTERVAL, pluckNearest, sproutInReach } from '../workers/growth';
import { LINE_SECONDS, openingScene, partScene } from '../story/scenes';
import { allPartsHome, currentSection } from '../campaign/campaign';
import type { DayPhase } from '../audio/music';
import { STORY_SUNSET_SECONDS } from './SkyLight';
import { ambientEmitters, nearestEmitters } from '../audio/spatial';
import type { SproutKind } from '../workers/sprouts';

const HUD_INTERVAL_FRAMES = 6;
/** A chime sounds when this much of the day is left, and the music picks up. */
const LAST_CALL_SECONDS = 30;
/** In the story, the Headmaster calls sunset with this much daylight left. */
const SUNSET_CALL = 60;
/** The clock ticks aloud through the final seconds. */
const TICKING_SECONDS = 10;
/** Simulation speed while fast-forward is held. */
const FAST_FORWARD = 3;
/** Distance the Warden walks between footsteps. */
const STRIDE = 1.5;
/** How close the Warden must stand to the little door to knock. */
const SECRET_RANGE = 2.6;
const probe = new Vector3();

/** Ashwick names the controls the player has bound, on whatever they are holding right now. */
const liveControls: CoachControls = {
  pad: () => useInputDevice.getState().device === 'pad',
  name: (action) => {
    const bindings = useGameStore.getState().settings.bindings;
    if (useInputDevice.getState().device === 'pad') {
      const button = bindings.pad[action];
      if (button !== null) return padName(button);
    }
    const code = bindings.keys[action].find((slot) => slot !== null);
    return code ? spokenKey(code) : 'its key (none is bound: see Settings)';
  },
  toggled: (action) => {
    const settings = useGameStore.getState().settings;
    return action === 'whistle' ? settings.whistleToggle : settings.fastToggle;
  },
};

interface GameLoopProps {
  expedition: Expedition;
  /** The rival's day, run alongside, in a battle. */
  battle: Battle | null;
  input: InputController;
  fx: Feedback;
  /** Called when the Warden goes down a way down or comes back up: the scene follows. */
  onSwitch: (sim: Simulation) => void;
}

/** The part of the day the music is arranged for, by the day clock. */
function musicPhase(sim: Simulation): DayPhase {
  const length = sim.level.dayLength;
  if (length <= 0 || sim.visit) return 'day';
  const gone = 1 - sim.timeLeft / length;
  const sunset = sim.story ? STORY_SUNSET_SECONDS : length * 0.15;
  if (sim.timeLeft <= sunset) return 'sunset';
  if (gone < 0.12) return 'morning';
  return 'day';
}

/** Seconds a boss's intro holds the day. */
const BOSS_INTRO_SECONDS = 3;

/** Each boss's variation on the boss music: the key it is played in. */
const BOSS_KEYS: Partial<Record<EnemyKind, number>> = {
  gravelmaw: -2,
  lanternroot: 3,
  bellwether: 0,
  snuffer: -5,
  galewing: 5,
  mirelord: -3,
  hollowwarden: -7,
};

/** A line under each boss's name in its intro. */
const BOSS_TITLES: Partial<Record<string, string>> = {
  gravelmaw: 'Old Tenant of the Pit',
  lanternroot: 'The Light That Grew Teeth',
  bellwether: 'It Tolls for Thee, Mostly',
  snuffer: 'Keeper of the Undercroft Dark',
  galewing: 'Rider of the Evening Wind',
  mirelord: 'Sovereign of the Flooded Pool',
  hollowwarden: 'Keeper of the Stopped Hour',
};

/** The first boss to be roused (hunting, hurt or clung to), with where it is. */
function rousedBoss(sim: Simulation): { kind: EnemyKind; x: number; z: number } | null {
  for (const [entity, enemy] of sim.enemies.entries()) {
    if (!ENEMY_SPECS[enemy.kind].boss || enemy.hp <= 0) continue;
    if (!enemy.alert && enemy.hp >= enemy.maxHp && enemy.latched.length === 0) continue;
    const at = sim.transforms.require(entity);
    return { kind: enemy.kind, x: at.x, z: at.z };
  }
  return null;
}

/** How tense the music should be: a boss fight, danger nearby, or an ordinary working day. */
function mood(sim: Simulation): { boss: boolean; intensity: Intensity } {
  let boss = false;
  let danger = false;
  for (const [, enemy] of sim.enemies.entries()) {
    const spec = ENEMY_SPECS[enemy.kind];
    if (spec.attack === 'none' || enemy.hp <= 0) continue;
    const roused = enemy.alert || enemy.latched.length > 0 || enemy.state !== 'roam';
    if (spec.boss && (roused || enemy.hp < enemy.maxHp)) boss = true;
    if (roused) danger = true;
  }
  return { boss, intensity: danger ? 2 : 1 };
}

/**
 * The main loop. Each rendered frame it projects the pointer onto the ground, runs
 * the fixed simulation steps that are due, hands their events to the feedback layer,
 * and forwards state to the HUD store, the coach and the soundtrack.
 * While the game is paused, or the briefing is still up, no steps run and no time
 * accumulates. It runs before every other frame callback so meshes read fresh state.
 */
export function GameLoop({ expedition, battle, input, fx, onSwitch }: GameLoopProps): null {
  const surface = expedition.surface;
  const element = useThree((state) => state.gl.domElement);
  const [clock] = useState(() => new FixedClock(SIM_DT, 5 * FAST_FORWARD));
  const [coach] = useState(
    () =>
      new Coach(
        typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
        liveControls,
      ),
  );
  const [headmaster] = useState(() => new Headmaster(surface));
  const frame = useRef(0);
  const pluckWait = useRef(0);
  const introTime = useRef(0);
  const sceneTime = useRef(0);
  const sceneLine = useRef(-1);
  const sceneOf = useRef('');
  const partsToday = useRef(0);
  const heard = useRef(new Map<number, { alert: boolean; state: string; hp: number }>());
  const emitting = useRef<Simulation | null>(null);
  // The field's ambient emitters stop with the day.
  useEffect(() => () => audio.stopEmitters(), []);
  const heaveBeat = useRef(-1);
  const walked = useRef(0);
  const lastSpot = useRef({ x: surface.captainTransform.x, z: surface.captainTransform.z });
  const wasFast = useRef(false);
  // The battle's outcome, once it has been called.
  const decided = useRef<BattleOutcome | null>(null);
  // Starts true if the scene remounts after the day already ended (a settings change).
  const finished = useRef(surface.ended !== null);
  // The splits of the best clear, kept from before this day started.
  const bestSplits = useRef(
    useGameStore.getState().save.bestSplits[splitKey(surface.level.id, surface.level.difficulty)] ??
      null,
  );

  useEffect(() => input.attach(element), [input, element]);

  useFrame(({ camera }, delta) => {
    const sim = expedition.active;
    const store = useGameStore.getState();
    // Presses count only while the day runs: any made while it is stopped are thrown away, not
    // saved up, and toggles let go.
    const live = store.phase === 'playing' && !store.paused && !store.briefing && !surface.ended;
    if (!live) input.clearPresses();
    input.live = live;
    input.pollPads(connectedPads(), delta);
    input.update(delta);
    probe.set(input.pointerX, input.pointerY, 0.5).unproject(camera).sub(camera.position);
    // Where the pointer meets the ground: first the flat floor, then the height found there,
    // twice, which settles onto a terrace top or a ramp.
    let t = -camera.position.y / probe.y;
    for (let i = 0; i < 2; i++) {
      const lift = heightAt(
        sim.level,
        camera.position.x + probe.x * t,
        camera.position.z + probe.z * t,
      );
      t = (lift - camera.position.y) / probe.y;
    }
    // Dragging the on-screen whistle button aims relative to the captain instead.
    // So does a gamepad's right stick, which snaps onto a job close to its line (aim assist).
    const aim = input.aimOffset;
    let cursorX = aim ? sim.captainTransform.x + aim.x : camera.position.x + probe.x * t;
    let cursorZ = aim ? sim.captainTransform.z + aim.z : camera.position.z + probe.z * t;
    if (input.padOwnsAim && input.aimAssist && live) {
      const from = sim.captainTransform;
      const snapped = assistAim(
        from,
        { x: cursorX, z: cursorZ },
        jobSpots(sim),
        CAPTAIN.cursorRange,
      );
      cursorX = snapped.x;
      cursorZ = snapped.z;
    }

    if (store.endRequested) {
      useGameStore.setState({ endRequested: false });
      if (!surface.ended) surface.endNow();
    }
    if (store.paused || store.briefing) {
      audio.setWhistle(false);
      return;
    }
    // A story scene: the day waits; each line stays a while, and a press moves it on.
    if (store.scene) {
      const line = store.scene.scene.lines[store.scene.line];
      if (sceneLine.current !== store.scene.line || sceneOf.current !== store.scene.scene.id) {
        sceneLine.current = store.scene.line;
        sceneOf.current = store.scene.scene.id;
        sceneTime.current = 0;
        audio.speak(line.who, line.text);
      }
      sceneTime.current += Math.min(delta, 0.1);
      if (sceneTime.current > (line.seconds ?? LINE_SECONDS) || input.takeInteract()) {
        store.nextSceneLine();
      }
      audio.setWhistle(false);
      return;
    }
    sceneLine.current = -1;
    // The story's beats: the first day in a section opens with its scene.
    if (sim.story && sim === surface && sim.tick === 0) {
      const section = store.save.campaign.section;
      const opening = openingScene(section);
      if (opening && !store.save.scenesSeen.includes(opening.id)) {
        store.playScene(opening);
        return;
      }
    }
    // A boss's intro: the day waits while it is shown; any press of the interact key, the
    // whistle or a click ends it early.
    if (store.bossIntro) {
      // Capped, so one slow frame never skips the intro altogether.
      introTime.current += Math.min(delta, 0.1);
      if (introTime.current > BOSS_INTRO_SECONDS || input.takeInteract() || input.held('whistle')) {
        store.showBossIntro(null);
      }
      audio.setWhistle(false);
      return;
    }
    const roused = rousedBoss(sim);
    if (roused && !store.save.bossIntros.includes(sim.level.id)) {
      introTime.current = 0;
      const spec = ENEMY_SPECS[roused.kind];
      store.showBossIntro({
        field: sim.level.id,
        kind: roused.kind,
        name: spec.name,
        title: BOSS_TITLES[roused.kind] ?? '',
        x: roused.x,
        z: roused.z,
      });
      audio.play('bossSting');
      audio.sting('boss');
      audio.playMusic('boss');
      return;
    }
    const fast = input.fast && !sim.ended;
    if (fast !== wasFast.current) {
      audio.play(fast ? 'fastOn' : 'fastOff');
      wasFast.current = fast;
    }
    const before = sim.timeLeft;
    const delivered = sim.stats.deliveryTimes.length;
    // During hit-stop the world holds its breath: no steps run and no time is saved up.
    const steps = fx.hitstop > 0 ? 0 : clock.advance(delta * (fast ? FAST_FORWARD : 1));
    fx.listenerX = sim.captainTransform.x;
    fx.listenerZ = sim.captainTransform.z;
    audio.setListener(sim.captainTransform.x, sim.captainTransform.z);
    // The place being played's ambient emitters, placed from its own features.
    if (emitting.current !== sim) {
      emitting.current = sim;
      heard.current.clear();
      const all = ambientEmitters(sim.level);
      audio.startEmitters(nearestEmitters(all, sim.captainTransform.x, sim.captainTransform.z));
    }
    let switched = false;
    const stepStart = performance.now();
    for (let i = 0; i < steps && !sim.ended; i++) {
      sim.step(input.sample(cursorX, cursorZ));
      // The rival keeps pace step by step, and the battle is called the moment it is won.
      if (battle && sim === surface && !surface.ended) {
        battle.advance(1);
        const outcome = battle.decide(surface);
        if (outcome) {
          decided.current = outcome;
          surface.ended = 'decided';
        }
      }
      for (const event of sim.events) fx.handle(event);
      if (sim === surface) headmaster.events(sim.events);
      // Below: a cave that is finished, or a Warden who fell there, settles the visit.
      if (expedition.below) {
        const was = expedition.active;
        expedition.settle();
        if (expedition.active !== was) {
          switched = true;
          break;
        }
      }
    }
    recordSteps(performance.now() - stepStart, steps);
    // The beasts, heard: a call when one notices you, its tell as it winds up, a yelp when hurt,
    // and now and then an idle grumble.
    if (steps > 0) {
      for (const [entity, enemy] of sim.enemies.entries()) {
        if (enemy.shape || enemy.kind === 'mound' || enemy.kind === 'rootknot') continue;
        const at = sim.transforms.require(entity);
        const was = heard.current.get(entity);
        if (was) {
          if (enemy.alert && !was.alert) audio.creature(enemy.kind, 'alert', at);
          if (enemy.state === 'windup' && was.state !== 'windup')
            audio.creature(enemy.kind, 'tell', at);
          if (enemy.hp < was.hp - 4 && enemy.hp > 0) audio.creature(enemy.kind, 'hurt', at);
          if (enemy.hp <= 0 && was.hp > 0) audio.creature(enemy.kind, 'death', at);
        }
        if (!enemy.alert && enemy.hp > 0 && Math.random() < 0.0015)
          audio.creature(enemy.kind, 'idle', at);
        heard.current.set(entity, { alert: enemy.alert, state: enemy.state, hp: enemy.hp });
      }
    }
    fx.update(delta);
    if (switched) {
      audio.play('doorOpen');
      onSwitch(expedition.active);
      return;
    }
    // Each relic home is announced by name, and logged in the Field Guide by the save.
    for (let i = delivered; i < sim.stats.treasuresCollected.length; i++) {
      const id = sim.stats.treasuresCollected[i];
      const spawn = sim.level.treasures.find((t) => t.id === id);
      const relic = relicFor(sim.level.id, id, spawn?.variant);
      fx.popup(relic.name, sim.level.kiln.x, sim.level.kiln.z - 3, '#fff2c8');
      headmaster.relic(relic);
      // A Clock part home in the story: a short scene at the Kiln.
      if (sim.story && currentSection(store.save.campaign).parts.includes(id)) {
        partsToday.current++;
        const count = allPartsHome(store.save.campaign) + partsToday.current;
        store.playScene(partScene(count, relic.name));
        audio.sting('part');
      }
    }
    // Each Sunshard home is compared with the same shard on the best story clear (surface only).
    const splits = sim === surface && store.playMode === 'lessons';
    for (let i = delivered; splits && i < sim.stats.deliveryTimes.length; i++) {
      const best = bestSplits.current?.[i];
      if (best === undefined) continue;
      const diff = sim.stats.deliveryTimes[i] - best;
      const { x, z } = sim.level.kiln;
      fx.popup(
        `${diff <= 0 ? '−' : '+'}${Math.abs(diff).toFixed(1)}s`,
        x - 2,
        z + 2,
        diff <= 0 ? '#7dff9a' : '#ff8a7a',
      );
      store.setSplit(diff);
    }
    audio.setWhistle(sim.captainState.whistleRadius > 0 && !sim.ended);
    if (before > LAST_CALL_SECONDS && sim.timeLeft <= LAST_CALL_SECONDS) audio.play('warning');
    // In the story the sun sets on whoever is still out: the minute before is called aloud.
    if (store.playMode === 'campaign' && before > SUNSET_CALL && sim.timeLeft <= SUNSET_CALL) {
      audio.play('warning');
      store.say({
        text: 'The sun is going down! Whistle everyone in and get them to the Kiln or a lit beacon.',
        mood: 'alarm',
      });
    }
    if (sim.timeLeft <= TICKING_SECONDS && Math.ceil(before) !== Math.ceil(sim.timeLeft)) {
      audio.play('tick');
    }

    // Footsteps, by distance walked rather than by time, so they keep pace with the Warden.
    const spot = sim.captainTransform;
    const stride = Math.hypot(spot.x - lastSpot.current.x, spot.z - lastSpot.current.z);
    lastSpot.current.x = spot.x;
    lastSpot.current.z = spot.z;
    // A knock-back is not a step.
    if (stride < 1) walked.current += stride;
    if (walked.current > STRIDE) {
      walked.current = 0;
      audio.play('step', { gain: 0.8 });
    }

    if (surface.ended) {
      if (!finished.current) {
        finished.current = true;
        audio.play('dayEnd');
        let outcome = decided.current ?? undefined;
        if (battle && !outcome) {
          // Sunset, or the Warden or squad lost, is judged as it stands. Ending the day early
          // from the pause menu concedes.
          const race = battle.race(surface);
          outcome = (surface.ended !== 'endedEarly' && battle.decide(surface)) || {
            mode: battle.mode,
            outcome: 'lost',
            you: race.you,
            rival: race.rival,
            unit: race.unit,
            reason: 'You ended the day early, and conceded.',
          };
        }
        if (battle) store.setRace(battle.race(surface));
        store.finishDay(surface, surface.ended, expedition.haul, outcome);
      }
      return;
    }

    const secret = sim.level.secret;
    const atDoor =
      secret !== undefined && Math.hypot(spot.x - secret.x, spot.z - secret.z) < SECRET_RANGE;
    store.setNearSecret(atDoor);
    // The way down (on the surface) and the way back up (where the Warden arrived below).
    const descent = sim.level.descent;
    const atStair =
      descent !== undefined && Math.hypot(spot.x - descent.x, spot.z - descent.z) < SECRET_RANGE;
    const start = sim.level.captain;
    const atAscent =
      expedition.below && Math.hypot(spot.x - start.x, spot.z - start.z) < SECRET_RANGE;
    if (atStair && store.nearDescent === null) audio.play('beaconLit');
    store.setNearDescent(atStair && descent ? descent.to : null);
    store.setNearAscent(atAscent);
    // In the story, the interact key plucks the sprout nearest the Warden; held, it sweeps
    // through a whole patch, one sprout at a time.
    // The story's own actions: switch Warden, split the squad, spray.
    if (sim.story) {
      if (input.take('switchWarden') && sim.switchWarden()) audio.play('select');
      if (input.take('splitSquad')) {
        const sent = sim.splitSquad();
        if (sent > 0) fx.popup(`${sent} sent to the other Warden`, spot.x, spot.z, '#bfe6ff');
      }
      if (input.take('emberbrew') && sim.sprayEmberbrew())
        fx.popup('Emberbrew!', spot.x, spot.z, '#ff9a5a');
      if (input.take('stillwater') && sim.sprayStillwater())
        fx.popup('Stillwater!', spot.x, spot.z, '#9ad0ff');
    }
    const pressed = input.takeInteract();
    store.setNearSprout(sim.story && sproutInReach(sim));
    // The Observatory's telescope: look through it and hidden treasure appears.
    const scope = sim.level.telescope;
    const atScope =
      scope !== undefined &&
      !sim.telescopeAimed &&
      Math.hypot(spot.x - scope.x, spot.z - scope.z) < SECRET_RANGE;
    store.setNearTelescope(atScope);
    if (atScope && pressed) {
      sim.aimTelescope();
      fx.popup('Something glints out there…', scope.x, scope.z, '#9ad0ff');
      return;
    }
    if (sim.story && !atDoor && !atStair && !atAscent) {
      pluckWait.current = Math.max(0, pluckWait.current - delta);
      if ((pressed || input.held('interact')) && pluckWait.current === 0 && pluckNearest(sim)) {
        pluckWait.current = PLUCK_INTERVAL;
      }
    } else if (pressed) {
      if (atDoor) {
        audio.play('knock');
        store.openPoker();
      } else if (atStair) {
        const why = expedition.blocked();
        if (why) {
          fx.popup(why, spot.x, spot.z, '#ffd0a0');
        } else if (expedition.descend()) {
          audio.play('doorOpen');
          onSwitch(expedition.active);
          return;
        }
      } else if (atAscent) {
        expedition.ascend();
        audio.play('doorOpen');
        onSwitch(expedition.active);
        return;
      }
    }

    // Crews chant as they carry, in time with each other: one "heave-ho" for the nearest haul
    // on the move, on a shared beat.
    const beat = Math.floor((sim.tick * SIM_DT) / HEAVE_SECONDS);
    if (beat !== heaveBeat.current) {
      heaveBeat.current = beat;
      let nearest = HEAVE_RANGE;
      let crew: SproutKind | null = null;
      for (const [entity, haul] of sim.carryables.entries()) {
        if (!haul.moving || haul.carriers.length === 0) continue;
        const at = sim.transforms.require(entity);
        const dist = Math.hypot(at.x - spot.x, at.z - spot.z);
        if (dist < nearest) {
          nearest = dist;
          crew = sim.workers.require(haul.carriers[0]).kind;
        }
      }
      if (crew) audio.voice(crew, 'heave', { gain: 1 - nearest / HEAVE_RANGE });
    }

    frame.current++;
    if (battle && frame.current % HUD_INTERVAL_FRAMES === 0) store.setRace(battle.race(surface));
    if (frame.current % HUD_INTERVAL_FRAMES === 0 || sim.entityVersion !== store.entityVersion) {
      store.publish(
        sim,
        expedition.below ? { name: sim.level.name, timeLeft: surface.timeLeft } : null,
      );
    }
    if (frame.current % HUD_INTERVAL_FRAMES === 0) {
      const seconds = steps * SIM_DT * HUD_INTERVAL_FRAMES;
      // Ashwick and the Headmaster watch the surface; below, the Warden is on their own.
      if (sim === surface) {
        store.setHint(store.settings.hints ? coach.update(sim, seconds) : null);
        const line = headmaster.update(seconds);
        if (line && store.settings.commentary) store.say(line);
      }
      const { boss, intensity } = mood(sim);
      audio.playMusic(boss ? 'boss' : sim.level.theme);
      const fight = rousedBoss(sim);
      if (fight) {
        const phase =
          [...sim.enemies.entries()].find(([, e]) => e.kind === fight.kind)?.[1].phase ?? 0;
        audio.setBossMusic(BOSS_KEYS[fight.kind] ?? 0, phase);
      }
      audio.setMusicMood(intensity, sim.timeLeft <= LAST_CALL_SECONDS);
      // The music follows the day: a morning arrangement, the working day, then sunset.
      audio.setDayPhase(musicPhase(sim));
    }
  }, -1);

  return null;
}
