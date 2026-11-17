import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { audio } from '../audio/audioManager';
import type { Intensity } from '../audio/music';
import type { InputController } from '../commands/input';
import { FixedClock } from '../core/clock';
import { SIM_DT } from '../core/config';
import { useGameStore } from '../core/gameStore';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import type { Simulation } from '../simulation/Simulation';
import { Coach } from '../story/coach';
import type { Feedback } from './feedback';

const HUD_INTERVAL_FRAMES = 6;
/** A chime sounds when this much of the day is left, and the music picks up. */
const LAST_CALL_SECONDS = 30;
/** The clock ticks aloud through the final seconds. */
const TICKING_SECONDS = 10;
/** Simulation speed while fast-forward is held. */
const FAST_FORWARD = 3;
/** Distance the Warden walks between footsteps. */
const STRIDE = 1.5;
/** How close the Warden must stand to the little door to knock. */
const SECRET_RANGE = 2.6;
const probe = new Vector3();

interface GameLoopProps {
  sim: Simulation;
  input: InputController;
  fx: Feedback;
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
export function GameLoop({ sim, input, fx }: GameLoopProps): null {
  const element = useThree((state) => state.gl.domElement);
  const [clock] = useState(() => new FixedClock(SIM_DT, 5 * FAST_FORWARD));
  const [coach] = useState(
    () =>
      new Coach(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches),
  );
  const frame = useRef(0);
  const walked = useRef(0);
  const lastSpot = useRef({ x: sim.captainTransform.x, z: sim.captainTransform.z });
  const wasFast = useRef(false);
  // Starts true if the scene remounts after the day already ended (a settings change).
  const finished = useRef(sim.ended !== null);

  useEffect(() => input.attach(element), [input, element]);

  useFrame(({ camera }, delta) => {
    probe.set(input.pointerX, input.pointerY, 0.5).unproject(camera).sub(camera.position);
    const t = -camera.position.y / probe.y;
    // Dragging the on-screen whistle button aims relative to the captain instead.
    const aim = input.aimOffset;
    const cursorX = aim ? sim.captainTransform.x + aim.x : camera.position.x + probe.x * t;
    const cursorZ = aim ? sim.captainTransform.z + aim.z : camera.position.z + probe.z * t;

    const store = useGameStore.getState();
    if (store.paused || store.briefing) {
      audio.setWhistle(false);
      // Any press made while the game was stopped is thrown away, not saved up.
      input.takeInteract();
      return;
    }
    const fast = input.fast && !sim.ended;
    if (fast !== wasFast.current) {
      audio.play(fast ? 'fastOn' : 'fastOff');
      wasFast.current = fast;
    }
    const before = sim.timeLeft;
    const steps = clock.advance(delta * (fast ? FAST_FORWARD : 1));
    fx.listenerX = sim.captainTransform.x;
    fx.listenerZ = sim.captainTransform.z;
    for (let i = 0; i < steps && !sim.ended; i++) {
      sim.step(input.sample(cursorX, cursorZ));
      for (const event of sim.events) fx.handle(event);
    }
    fx.update(delta);
    audio.setWhistle(sim.captainState.whistleRadius > 0 && !sim.ended);
    if (before > LAST_CALL_SECONDS && sim.timeLeft <= LAST_CALL_SECONDS) audio.play('warning');
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

    if (sim.ended) {
      if (!finished.current) {
        finished.current = true;
        audio.play('dayEnd');
        store.finishDay(sim, sim.ended);
      }
      return;
    }

    const secret = sim.level.secret;
    const atDoor =
      secret !== undefined && Math.hypot(spot.x - secret.x, spot.z - secret.z) < SECRET_RANGE;
    store.setNearSecret(atDoor);
    const { descent } = sim.level;
    const atStair =
      descent !== undefined && Math.hypot(spot.x - descent.x, spot.z - descent.z) < SECRET_RANGE;
    if (atStair && store.nearDescent === null) audio.play('beaconLit');
    store.setNearDescent(atStair && descent ? descent.to : null);
    if (input.takeInteract()) {
      if (atDoor) {
        audio.play('knock');
        store.openPoker();
      } else if (atStair && descent) {
        audio.play('doorOpen');
        store.startDay(descent.to);
        return;
      }
    }

    frame.current++;
    if (frame.current % HUD_INTERVAL_FRAMES === 0 || sim.entityVersion !== store.entityVersion) {
      store.publish(sim);
    }
    if (frame.current % HUD_INTERVAL_FRAMES === 0) {
      const seconds = steps * SIM_DT * HUD_INTERVAL_FRAMES;
      store.setHint(store.settings.hints ? coach.update(sim, seconds) : null);
      const { boss, intensity } = mood(sim);
      audio.playMusic(boss ? 'boss' : sim.level.theme);
      audio.setMusicMood(intensity, sim.timeLeft <= LAST_CALL_SECONDS);
    }
  }, -1);

  return null;
}
