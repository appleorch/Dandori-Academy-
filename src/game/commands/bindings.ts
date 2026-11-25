/**
 * What every control does, and which keys, mouse buttons and gamepad buttons do it. The player
 * can rebind any action in the settings; these are the defaults and the rules for reading saved
 * bindings back safely.
 *
 * Keyboard bindings are `KeyboardEvent.code` values, so they follow the key's place on the
 * keyboard rather than its letter (WASD stays WASD on an AZERTY layout). Mouse buttons are
 * written `Mouse0` (left), `Mouse1` (middle) and `Mouse2` (right). Gamepad buttons are indices
 * in the browser's standard gamepad layout (see PAD_BUTTONS).
 */

export const ACTIONS = [
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'throw',
  'whistle',
  'charge',
  'dismiss',
  'interact',
  'nextKind',
  'prevKind',
  'kind1',
  'kind2',
  'kind3',
  'kind4',
  'fastForward',
  'peek',
  'tactical',
  'zoomIn',
  'zoomOut',
  'pause',
  'restart',
  'switchWarden',
  'splitSquad',
  'emberbrew',
  'stillwater',
  'map',
] as const;
export type Action = (typeof ACTIONS)[number];

/** How each action is named in the Controls page and its group there. */
export const ACTION_INFO: Record<Action, { label: string; group: 'move' | 'squad' | 'view' }> = {
  moveUp: { label: 'Move up', group: 'move' },
  moveDown: { label: 'Move down', group: 'move' },
  moveLeft: { label: 'Move left', group: 'move' },
  moveRight: { label: 'Move right', group: 'move' },
  throw: { label: 'Throw (hold to keep throwing)', group: 'squad' },
  whistle: { label: 'Whistle (hold to grow the call)', group: 'squad' },
  charge: { label: 'Charge: the squad runs to the cursor', group: 'squad' },
  dismiss: { label: 'Dismiss the squad', group: 'squad' },
  interact: { label: 'Interact: go down, come up, knock', group: 'squad' },
  nextKind: { label: 'Next kind of Sproutling', group: 'squad' },
  prevKind: { label: 'Previous kind of Sproutling', group: 'squad' },
  kind1: { label: 'Choose Emberlings', group: 'squad' },
  kind2: { label: 'Choose Dewlings', group: 'squad' },
  kind3: { label: 'Choose Stonelings', group: 'squad' },
  kind4: { label: 'Choose Sparklings', group: 'squad' },
  fastForward: { label: 'Fast-forward the day', group: 'view' },
  peek: { label: 'Look at idle Sproutlings', group: 'view' },
  tactical: { label: 'Tactical view of the whole field', group: 'view' },
  zoomIn: { label: 'Zoom in', group: 'view' },
  zoomOut: { label: 'Zoom out', group: 'view' },
  pause: { label: 'Pause', group: 'view' },
  restart: { label: 'Restart (from pause or results)', group: 'view' },
  switchWarden: { label: 'Story: switch to the other Warden', group: 'squad' },
  splitSquad: { label: 'Story: send half the squad to the other Warden', group: 'squad' },
  emberbrew: { label: 'Story: spray Emberbrew (a faster, fiercer squad)', group: 'squad' },
  stillwater: { label: 'Story: spray Stillwater (freezes nearby beasts)', group: 'squad' },
  map: { label: 'Hold for the full map', group: 'view' },
};

/** Two keyboard or mouse slots per action; null is an empty slot. */
export type KeySlots = readonly [string | null, string | null];
/** One gamepad button per action; null is unbound. */
export type PadSlot = number | null;

export interface Bindings {
  keys: Record<Action, KeySlots>;
  pad: Record<Action, PadSlot>;
}

/** Buttons of the standard gamepad layout, by index, with the names shown on screen. */
export const PAD_BUTTONS = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'View',
  'Menu',
  'L3',
  'R3',
  'D-pad up',
  'D-pad down',
  'D-pad left',
  'D-pad right',
  'Home',
] as const;
export const PAD = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  lb: 4,
  rb: 5,
  lt: 6,
  rt: 7,
  view: 8,
  menu: 9,
  l3: 10,
  r3: 11,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  home: 16,
} as const;

export const DEFAULT_BINDINGS: Bindings = {
  keys: {
    moveUp: ['KeyW', 'ArrowUp'],
    moveDown: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    throw: ['Mouse0', null],
    whistle: ['Mouse2', 'Space'],
    charge: ['KeyF', 'Mouse1'],
    dismiss: ['KeyQ', null],
    interact: ['KeyE', null],
    nextKind: ['KeyC', null],
    prevKind: ['KeyX', null],
    kind1: ['Digit1', null],
    kind2: ['Digit2', null],
    kind3: ['Digit3', null],
    kind4: ['Digit4', null],
    fastForward: ['ShiftLeft', 'ShiftRight'],
    peek: ['Tab', null],
    tactical: ['KeyV', null],
    zoomIn: ['Equal', 'NumpadAdd'],
    zoomOut: ['Minus', 'NumpadSubtract'],
    pause: ['Escape', 'KeyP'],
    restart: ['KeyR', null],
    switchWarden: ['KeyH', null],
    splitSquad: ['KeyG', null],
    emberbrew: ['KeyB', null],
    stillwater: ['KeyN', null],
    map: ['KeyM', null],
  },
  pad: {
    moveUp: null,
    moveDown: null,
    moveLeft: null,
    moveRight: null,
    throw: PAD.rt,
    whistle: PAD.lt,
    charge: PAD.a,
    dismiss: PAD.b,
    interact: PAD.x,
    nextKind: PAD.rb,
    prevKind: PAD.lb,
    kind1: null,
    kind2: null,
    kind3: null,
    kind4: null,
    fastForward: PAD.view,
    peek: PAD.left,
    tactical: PAD.y,
    zoomIn: PAD.up,
    zoomOut: PAD.down,
    pause: PAD.menu,
    restart: null,
    switchWarden: null,
    splitSquad: null,
    emberbrew: null,
    stillwater: null,
    map: null,
  },
};

/** Escape always pauses and backs out of menus, whatever else it is bound to; it cannot be captured. */
export const RESERVED_KEY = 'Escape';

const KEY_NAMES: Record<string, string> = {
  Mouse0: 'Left mouse',
  Mouse1: 'Middle mouse',
  Mouse2: 'Right mouse',
  Mouse3: 'Mouse back',
  Mouse4: 'Mouse forward',
  Space: 'Space',
  Escape: 'Esc',
  Tab: 'Tab',
  Enter: 'Enter',
  Backspace: 'Backspace',
  ShiftLeft: 'Left Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Left Ctrl',
  ControlRight: 'Right Ctrl',
  AltLeft: 'Left Alt',
  AltRight: 'Right Alt',
  MetaLeft: 'Left Meta',
  MetaRight: 'Right Meta',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Equal: '=',
  Minus: '-',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Backslash: '\\',
  Comma: ',',
  Period: '.',
  Slash: '/',
  CapsLock: 'Caps Lock',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadEnter: 'Num Enter',
  NumpadDecimal: 'Num .',
};

/** A short readable name for a key or mouse code, such as "W", "Left mouse" or "Num 4". */
export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  if (/^F\d{1,2}$/.test(code)) return code;
  return code;
}

/** The on-screen name of a gamepad button. */
export function padName(button: number): string {
  return PAD_BUTTONS[button] ?? `Button ${button}`;
}

/** Whether a code could have come from a key or a mouse button. */
function validKey(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Za-z][A-Za-z0-9]{0,24}$/.test(code);
}

function validPad(button: unknown): button is number {
  return typeof button === 'number' && Number.isInteger(button) && button >= 0 && button < 32;
}

/** A deep copy, so a binding table can be changed without touching the one it came from. */
export function copyBindings(bindings: Bindings): Bindings {
  const keys = {} as Record<Action, KeySlots>;
  for (const action of ACTIONS) keys[action] = [...bindings.keys[action]];
  return { keys, pad: { ...bindings.pad } };
}

/**
 * Builds bindings from untrusted saved data: each valid slot is kept, everything else is the
 * default. Actions added in later versions get their defaults.
 */
export function parseBindings(value: unknown): Bindings {
  const bindings = copyBindings(DEFAULT_BINDINGS);
  if (typeof value !== 'object' || value === null) return bindings;
  const raw = value as { keys?: unknown; pad?: unknown };
  if (typeof raw.keys === 'object' && raw.keys !== null) {
    const keys = raw.keys as Record<string, unknown>;
    for (const action of ACTIONS) {
      const slots = keys[action];
      if (!Array.isArray(slots) || slots.length !== 2) continue;
      const [a, b] = slots.map((slot) => (validKey(slot) ? slot : null));
      bindings.keys[action] = [a, b === a ? null : b];
    }
  }
  if (typeof raw.pad === 'object' && raw.pad !== null) {
    const pad = raw.pad as Record<string, unknown>;
    for (const action of ACTIONS) {
      if (validPad(pad[action])) bindings.pad[action] = pad[action];
      else if (pad[action] === null) bindings.pad[action] = null;
    }
  }
  return bindings;
}

/** Every action bound to a key or mouse button. */
export function actionsForKey(bindings: Bindings, code: string): Action[] {
  return ACTIONS.filter((action) => bindings.keys[action].includes(code));
}

/** Every action bound to a gamepad button. */
export function actionsForPad(bindings: Bindings, button: number): Action[] {
  return ACTIONS.filter((action) => bindings.pad[action] === button);
}

export interface Conflict {
  /** The key code or the gamepad button shared. */
  input: string | number;
  device: 'keys' | 'pad';
  actions: Action[];
}

/** Keys and buttons that more than one action is bound to. */
export function findConflicts(bindings: Bindings): Conflict[] {
  const conflicts: Conflict[] = [];
  const keys = new Map<string, Action[]>();
  const pads = new Map<number, Action[]>();
  for (const action of ACTIONS) {
    for (const code of new Set(bindings.keys[action])) {
      if (code !== null) keys.set(code, [...(keys.get(code) ?? []), action]);
    }
    const button = bindings.pad[action];
    if (button !== null) pads.set(button, [...(pads.get(button) ?? []), action]);
  }
  for (const [input, actions] of keys) {
    if (actions.length > 1) conflicts.push({ input, device: 'keys', actions });
  }
  for (const [input, actions] of pads) {
    if (actions.length > 1) conflicts.push({ input, device: 'pad', actions });
  }
  return conflicts;
}

/** Actions with no key or mouse button at all: they cannot be used from the keyboard. */
export function unboundKeys(bindings: Bindings): Action[] {
  return ACTIONS.filter((action) => bindings.keys[action].every((code) => code === null));
}

export interface Rebound {
  bindings: Bindings;
  /** Actions the key or button was taken from, so the player can be told. */
  takenFrom: Action[];
}

/**
 * Binds a key or mouse button to one slot of an action. A key already used by another action
 * is taken from it, never shared: two actions on one key would fire together by surprise.
 */
export function bindKey(
  bindings: Bindings,
  action: Action,
  slot: 0 | 1,
  code: string | null,
): Rebound {
  const next = copyBindings(bindings);
  const takenFrom: Action[] = [];
  if (code !== null) {
    for (const other of ACTIONS) {
      const slots = next.keys[other];
      if (!slots.includes(code)) continue;
      if (other !== action) takenFrom.push(other);
      next.keys[other] = [slots[0] === code ? null : slots[0], slots[1] === code ? null : slots[1]];
    }
  }
  const slots = [...next.keys[action]] as [string | null, string | null];
  slots[slot] = code;
  next.keys[action] = slots;
  return { bindings: next, takenFrom };
}

/** Binds a gamepad button to an action, taking it from any other action that had it. */
export function bindPad(bindings: Bindings, action: Action, button: number | null): Rebound {
  const next = copyBindings(bindings);
  const takenFrom: Action[] = [];
  if (button !== null) {
    for (const other of ACTIONS) {
      if (other !== action && next.pad[other] === button) {
        next.pad[other] = null;
        takenFrom.push(other);
      }
    }
  }
  next.pad[action] = button;
  return { bindings: next, takenFrom };
}

/** Whether two binding tables are the same. */
export function sameBindings(a: Bindings, b: Bindings): boolean {
  return ACTIONS.every(
    (action) =>
      a.keys[action][0] === b.keys[action][0] &&
      a.keys[action][1] === b.keys[action][1] &&
      a.pad[action] === b.pad[action],
  );
}

/** The names of an action's keys, joined, for prompts such as "Pause (Esc)"; empty if unbound. */
export function keyLabel(bindings: Bindings, action: Action): string {
  return bindings.keys[action]
    .filter((code): code is string => code !== null)
    .map(keyName)
    .join(' / ');
}

/** The name of an action's gamepad button, or empty if unbound. */
export function padLabel(bindings: Bindings, action: Action): string {
  const button = bindings.pad[action];
  return button === null ? '' : padName(button);
}
