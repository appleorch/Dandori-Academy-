import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import type { InputController } from '../commands/input';
import { FixedClock } from '../core/clock';
import { SIM_DT } from '../core/config';
import { audio } from '../audio/audioManager';
import { useGameStore } from '../core/gameStore';
import type { Simulation } from '../simulation/Simulation';
import type { Feedback } from './feedback';

const HUD_INTERVAL_FRAMES = 6;
/** A chime sounds when this much of the day is left. */
const LAST_CALL_SECONDS = 30;
const probe = new Vector3();

interface GameLoopProps {
  sim: Simulation;
  input: InputController;
  fx: Feedback;
}

/**
 * The main loop. Each rendered frame it projects the pointer onto the ground, runs
 * the fixed simulation steps that are due, hands their events to the feedback layer,
 * and forwards state to the HUD store.
 * While the game is paused no steps run and no time accumulates.
 * It runs before every other frame callback so meshes read fresh state.
 */
export function GameLoop({ sim, input, fx }: GameLoopProps): null {
  const element = useThree((state) => state.gl.domElement);
  const [clock] = useState(() => new FixedClock(SIM_DT));
  const frame = useRef(0);
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
    if (store.paused) {
      audio.setWhistle(false);
      return;
    }
    const before = sim.timeLeft;
    const steps = clock.advance(delta);
    for (let i = 0; i < steps && !sim.ended; i++) {
      sim.step(input.sample(cursorX, cursorZ));
      for (const event of sim.events) fx.handle(event);
    }
    fx.update(delta);
    audio.setWhistle(sim.captainState.whistleRadius > 0 && !sim.ended);
    if (before > LAST_CALL_SECONDS && sim.timeLeft <= LAST_CALL_SECONDS) audio.play('warning');

    if (sim.ended) {
      if (!finished.current) {
        finished.current = true;
        audio.play('dayEnd');
        store.finishDay(sim, sim.ended);
      }
      return;
    }
    frame.current++;
    if (frame.current % HUD_INTERVAL_FRAMES === 0 || sim.entityVersion !== store.entityVersion) {
      store.publish(sim);
    }
  }, -1);

  return null;
}
