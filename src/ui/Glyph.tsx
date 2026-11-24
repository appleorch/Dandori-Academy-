import { keyLabel, PAD, padName, type Action } from '../game/commands/bindings';
import { useInputDevice } from '../game/commands/device';
import { useGameStore } from '../game/core/gameStore';

/** Face buttons get their usual colours, so "press A" can be found at a glance. */
const FACE: Partial<Record<number, string>> = {
  [PAD.a]: 'face-a',
  [PAD.b]: 'face-b',
  [PAD.x]: 'face-x',
  [PAD.y]: 'face-y',
};

/** Short names that fit a round button glyph. */
const SHORT: Partial<Record<number, string>> = {
  [PAD.up]: '↑',
  [PAD.down]: '↓',
  [PAD.left]: '←',
  [PAD.right]: '→',
  [PAD.view]: '⧉',
  [PAD.menu]: '≡',
};

/** A gamepad button drawn as it looks on the pad. */
export function PadGlyph({ button }: { button: number }) {
  const face = FACE[button];
  const dpad = button >= PAD.up && button <= PAD.right;
  const className = face ? `pad-glyph face ${face}` : dpad ? 'pad-glyph dpad' : 'pad-glyph pill';
  return (
    <kbd className={className} title={padName(button)} aria-label={padName(button)}>
      {SHORT[button] ?? padName(button)}
    </kbd>
  );
}

/**
 * The control for an action, as the player last used: a key on the keyboard or a button on a
 * pad. Nothing on touch, where the buttons are on screen. Falls back to the other device when
 * the action has nothing bound on the one in use.
 */
export function ActionPrompt({ action, fallback }: { action: Action; fallback?: string }) {
  const device = useInputDevice((state) => state.device);
  const bindings = useGameStore((state) => state.settings.bindings);
  if (device === 'touch') return null;
  const button = bindings.pad[action];
  if (device === 'pad' && button !== null) return <PadGlyph button={button} />;
  const keys = keyLabel(bindings, action) || fallback;
  if (keys) return <kbd>{keys.split(' / ')[0]}</kbd>;
  return button !== null ? <PadGlyph button={button} /> : null;
}

/** A fixed prompt that is not one of the rebindable actions (Enter to begin, A to confirm). */
export function MenuPrompt({ keyName, button }: { keyName: string; button: number }) {
  const device = useInputDevice((state) => state.device);
  if (device === 'touch') return null;
  return device === 'pad' ? <PadGlyph button={button} /> : <kbd>{keyName}</kbd>;
}
