import { useTouchDevice } from './useTouchDevice';

type ControlList = readonly (readonly [string, string])[];

const KEYBOARD: ControlList = [
  ['WASD', 'Move'],
  ['Left mouse', 'Throw (hold to keep throwing)'],
  ['Right mouse / Space', 'Whistle workers back'],
  ['F / Middle mouse', 'Charge: send the whole squad to the cursor'],
  ['Q', 'Dismiss the squad'],
  ['1 to 4 / C', 'Choose which kind of Sproutling to throw / cycle kinds'],
  ['Shift', 'Hold to fast-forward the day'],
  ['Tab', 'Hold to look at your idle Emberlings'],
  ['V', 'Tactical view: pull right out over the whole course'],
  ['Esc', 'Pause (then R restarts the lesson)'],
  ['Wheel', 'Zoom'],
];

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

export function Controls() {
  const touch = useTouchDevice();
  return (
    <dl className="controls">
      {(touch ? TOUCH : KEYBOARD).map(([key, action]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{action}</dd>
        </div>
      ))}
    </dl>
  );
}
