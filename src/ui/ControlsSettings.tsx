import { useEffect, useRef, useState } from 'react';
import {
  ACTION_INFO,
  ACTIONS,
  bindKey,
  bindPad,
  DEFAULT_BINDINGS,
  findConflicts,
  keyName,
  PAD,
  padName,
  RESERVED_KEY,
  sameBindings,
  unboundKeys,
  type Action,
  type Bindings,
} from '../game/commands/bindings';
import { connectedPads, PadReader } from '../game/commands/gamepad';
import { useInputDevice } from '../game/commands/device';
import { useGameStore } from '../game/core/gameStore';
import { PadGlyph } from './Glyph';
import { padCapture } from './usePadNavigation';

type Slot = 0 | 1 | 'pad';

interface Capture {
  action: Action;
  slot: Slot;
}

const GROUPS = [
  ['move', 'Moving'],
  ['squad', 'The squad'],
  ['view', 'The day and the view'],
] as const;

/** After a capture ends, the click that ended it must not start another. */
const SETTLE_MS = 250;

/**
 * Every action with its two keyboard slots and its gamepad button. Choose a slot, then press
 * the key, mouse button or pad button to bind there. A key already in use is moved, never
 * shared, and the player is told what lost it. Escape cancels; Backspace clears the slot.
 */
export function ControlsSettings() {
  const bindings = useGameStore((state) => state.settings.bindings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const padConnected = useInputDevice((state) => state.padConnected);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [message, setMessage] = useState('');
  const settledAt = useRef(0);

  const save = (next: Bindings): void => updateSettings({ bindings: next });

  const finish = (text: string): void => {
    settledAt.current = performance.now();
    setCapture(null);
    setMessage(text);
  };

  const describe = (input: string, action: Action, takenFrom: Action[]): string => {
    const label = ACTION_INFO[action].label;
    if (takenFrom.length === 0) return `${label}: ${input}.`;
    const from = takenFrom.map((other) => ACTION_INFO[other].label).join(', ');
    return `${label}: ${input}. It was taken from ${from}.`;
  };

  // Keyboard and mouse capture. Listening in the capture phase on the window, and stopping the
  // event there, keeps the key from also pausing the game or moving the Warden.
  useEffect(() => {
    if (!capture || capture.slot === 'pad') return;
    const slot = capture.slot;
    const assign = (code: string | null): void => {
      const { bindings: next, takenFrom } = bindKey(bindings, capture.action, slot, code);
      save(next);
      finish(
        code === null
          ? `${ACTION_INFO[capture.action].label}: slot cleared.`
          : describe(keyName(code), capture.action, takenFrom),
      );
    };
    const onKey = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (event.code === RESERVED_KEY) finish('Cancelled.');
      else if (event.code === 'Backspace' || event.code === 'Delete') assign(null);
      else assign(event.code);
    };
    const onPointer = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      assign(`Mouse${event.button}`);
    };
    const onMenu = (event: Event): void => event.preventDefault();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('contextmenu', onMenu, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
      // The context menu of a right click that was just bound is swallowed a moment longer.
      window.setTimeout(() => window.removeEventListener('contextmenu', onMenu, true), SETTLE_MS);
    };
    // `save`, `finish` and `describe` only close over state read here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture, bindings]);

  // Gamepad capture: the first button pressed after the capture began. Menu is kept for pausing.
  useEffect(() => {
    if (!capture || capture.slot !== 'pad') return;
    padCapture.active = true;
    const reader = new PadReader();
    reader.absorb(connectedPads());
    let raf = 0;
    const tick = (): void => {
      raf = requestAnimationFrame(tick);
      const frame = reader.read(connectedPads(), bindings);
      const button = frame.buttonsPressed[0];
      if (button === undefined) return;
      if (button === PAD.menu) {
        finish('Cancelled. (Menu always pauses, so it cannot be bound.)');
        return;
      }
      const { bindings: next, takenFrom } = bindPad(bindings, capture.action, button);
      save(next);
      finish(describe(padName(button), capture.action, takenFrom));
    };
    raf = requestAnimationFrame(tick);
    const onKey = (event: KeyboardEvent): void => {
      if (event.code !== RESERVED_KEY && event.code !== 'Backspace' && event.code !== 'Delete')
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === RESERVED_KEY) {
        finish('Cancelled.');
      } else {
        save(bindPad(bindings, capture.action, null).bindings);
        finish(`${ACTION_INFO[capture.action].label}: pad button cleared.`);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
      // Let go only once the button that was bound is no longer seen as a fresh press.
      window.setTimeout(() => {
        padCapture.active = false;
      }, SETTLE_MS);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture, bindings]);

  const start = (action: Action, slot: Slot): void => {
    if (performance.now() - settledAt.current < SETTLE_MS) return;
    setMessage(
      slot === 'pad'
        ? `Press a gamepad button for ${ACTION_INFO[action].label}. Esc cancels, Backspace clears.`
        : `Press a key or mouse button for ${ACTION_INFO[action].label}. Esc cancels, Backspace clears.`,
    );
    setCapture({ action, slot });
  };

  const unbound = unboundKeys(bindings);
  const conflicts = findConflicts(bindings);
  const waiting = (action: Action, slot: Slot): boolean =>
    capture?.action === action && capture.slot === slot;

  return (
    <section className="controls-settings" aria-labelledby="controls-heading">
      <h3 id="controls-heading">Controls</h3>
      <p className="setting-note">
        Choose a slot, then press the key, mouse button or gamepad button for it. Esc always pauses
        and Menu on a pad always pauses, whatever else is bound.
        {!padConnected && ' No gamepad found yet: press any button on one to wake it.'}
      </p>
      <p className="setting-note" role="status" aria-live="polite">
        {message}
      </p>
      {(unbound.length > 0 || conflicts.length > 0) && (
        <ul className="binding-warnings">
          {unbound.map((action) => (
            <li key={`unbound-${action}`}>No key or mouse button: {ACTION_INFO[action].label}</li>
          ))}
          {conflicts.map((conflict) => (
            <li key={`conflict-${conflict.device}-${conflict.input}`}>
              {conflict.device === 'pad'
                ? padName(conflict.input as number)
                : keyName(conflict.input as string)}{' '}
              does two things: {conflict.actions.map((a) => ACTION_INFO[a].label).join(' and ')}
            </li>
          ))}
        </ul>
      )}
      <table className="bindings">
        <colgroup>
          <col />
          <col className="key-col" />
          <col className="key-col" />
          <col className="pad-col" />
        </colgroup>
        {GROUPS.map(([group, title]) => (
          <tbody key={group}>
            <tr>
              <th scope="colgroup" colSpan={4} className="binding-group">
                {title}
              </th>
            </tr>
            {ACTIONS.filter((action) => ACTION_INFO[action].group === group).map((action) => (
              <tr key={action}>
                <th scope="row">{ACTION_INFO[action].label}</th>
                {([0, 1] as const).map((slot) => {
                  const code = bindings.keys[action][slot];
                  return (
                    <td key={slot}>
                      <button
                        type="button"
                        className={waiting(action, slot) ? 'binding waiting' : 'binding'}
                        title={code ? keyName(code) : undefined}
                        aria-label={`${ACTION_INFO[action].label}, ${slot === 0 ? 'first' : 'second'} key: ${code ? keyName(code) : 'none'}. Press to change.`}
                        onClick={() => start(action, slot)}
                      >
                        {waiting(action, slot) ? 'Press…' : code ? keyName(code) : '—'}
                      </button>
                    </td>
                  );
                })}
                <td>
                  <button
                    type="button"
                    className={waiting(action, 'pad') ? 'binding pad waiting' : 'binding pad'}
                    aria-label={`${ACTION_INFO[action].label}, gamepad: ${bindings.pad[action] !== null ? padName(bindings.pad[action]) : 'none'}. Press to change.`}
                    onClick={() => start(action, 'pad')}
                  >
                    {waiting(action, 'pad') ? (
                      'Press…'
                    ) : bindings.pad[action] !== null ? (
                      <PadGlyph button={bindings.pad[action]} />
                    ) : (
                      '—'
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <p className="setting-note">
        On a pad the left stick always moves and the right stick aims; in menus the D-pad or left
        stick moves between buttons, A chooses and B goes back.
      </p>
      <button
        type="button"
        className="secondary small"
        disabled={sameBindings(bindings, DEFAULT_BINDINGS)}
        onClick={() => {
          save(DEFAULT_BINDINGS);
          setMessage('Controls reset to the defaults.');
        }}
      >
        Reset controls to the defaults
      </button>
    </section>
  );
}
