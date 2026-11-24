import type { ReactNode } from 'react';
import { keyLabel, type Action, type Bindings } from '../game/commands/bindings';
import { useInputDevice } from '../game/commands/device';
import { useGameStore } from '../game/core/gameStore';
import { PadGlyph } from './Glyph';
import { useTouchDevice } from './useTouchDevice';

type ControlList = readonly (readonly [ReactNode, string])[];

/** What each action does, in the order the list shows them. */
const LISTED: readonly (readonly [Action | readonly Action[], string])[] = [
  ['throw', 'Throw (hold to keep throwing)'],
  ['whistle', 'Whistle workers back'],
  ['charge', 'Charge: send the whole squad to the cursor'],
  ['dismiss', 'Dismiss the squad'],
  [['prevKind', 'nextKind'], 'Choose which kind of Sproutling to throw'],
  ['interact', 'Go down, come back up, knock'],
  ['fastForward', 'Fast-forward the day'],
  ['peek', 'Look at your idle Sproutlings'],
  ['tactical', 'Tactical view: pull right out over the whole course'],
  [['zoomIn', 'zoomOut'], 'Zoom'],
  ['pause', 'Pause'],
];

function keyboard(bindings: Bindings): ControlList {
  const move = (['moveUp', 'moveLeft', 'moveDown', 'moveRight'] as const)
    .map((action) => keyLabel(bindings, action).split(' / ')[0])
    .join('');
  const rows: [ReactNode, string][] = [[move || 'Unbound', 'Move']];
  for (const [actions, text] of LISTED) {
    const names = (typeof actions === 'string' ? [actions] : actions)
      .map((action) => keyLabel(bindings, action))
      .filter(Boolean)
      .join(' / ');
    rows.push([names || 'Unbound', text]);
  }
  rows.push(['Wheel', 'Zoom']);
  return rows;
}

function pad(bindings: Bindings): ControlList {
  const rows: [ReactNode, string][] = [
    ['Left stick', 'Move'],
    ['Right stick', 'Aim (snaps onto nearby jobs with aim assist)'],
  ];
  for (const [actions, text] of LISTED) {
    const buttons = (typeof actions === 'string' ? [actions] : actions)
      .map((action) => bindings.pad[action])
      .filter((button): button is number => button !== null);
    if (buttons.length === 0) continue;
    rows.push([
      <span className="glyphs">
        {buttons.map((button) => (
          <PadGlyph key={button} button={button} />
        ))}
      </span>,
      text,
    ]);
  }
  return rows;
}

const TOUCH: ControlList = [
  ['Joystick', 'Move'],
  ['Touch the field', 'Throw there (hold to keep throwing)'],
  ['Whistle button', 'Hold to call workers; drag to move the call'],
  ['Charge button', 'Send the whole squad to where you last aimed'],
  ['Dismiss button', 'Dismiss the squad'],
  ['Kind button', 'Switch which kind of Sproutling you throw'],
  ['Fast-forward button', 'Hold to hurry the day along'],
  ['Map button', 'Tactical view over the whole course'],
  ['Pinch', 'Zoom'],
];

/** The controls, for whatever the player last used: keyboard and mouse, a gamepad, or touch. */
export function Controls() {
  const touch = useTouchDevice();
  const device = useInputDevice((state) => state.device);
  const bindings = useGameStore((state) => state.settings.bindings);
  const list =
    device === 'pad' ? pad(bindings) : touch || device === 'touch' ? TOUCH : keyboard(bindings);
  return (
    <dl className="controls">
      {list.map(([key, action], i) => (
        <div key={`${i}-${action}`}>
          <dt>{key}</dt>
          <dd>{action}</dd>
        </div>
      ))}
    </dl>
  );
}
