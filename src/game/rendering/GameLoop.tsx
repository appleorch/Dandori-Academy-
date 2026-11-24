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
import { ENEMY_SPECS } from '../enemies/enemyKinds';
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
        expedition.settle();
        if (!expedition.below) {
          switched = true;
          break;
        }
      }
    }
    recordSteps(performance.now() - stepStart, steps);
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
    const descent = expedition.below ? undefined : sim.level.descent;
    const atStair =
      descent !== undefined && Math.hypot(spot.x - descent.x, spot.z - descent.z) < SECRET_RANGE;
    const start = sim.level.captain;
    const atAscent =
      expedition.below && Math.hypot(spot.x - start.x, spot.z - start.z) < SECRET_RANGE;
    if (atStair && store.nearDescent === null) audio.play('beaconLit');
    store.setNearDescent(atStair && descent ? descent.to : null);
    store.setNearAscent(atAscent);
    if (input.takeInteract()) {
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
      audio.setMusicMood(intensity, sim.timeLeft <= LAST_CALL_SECONDS);
    }
  }, -1);

  return null;
}
