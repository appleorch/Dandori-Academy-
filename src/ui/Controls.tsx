const CONTROLS: readonly (readonly [string, string])[] = [
  ['WASD', 'Move'],
  ['Left mouse', 'Throw (hold to keep throwing)'],
  ['Right mouse / Space', 'Whistle workers back'],
  ['F / Middle mouse', 'Charge: send the whole squad to the cursor'],
  ['Q', 'Dismiss the squad'],
  ['Esc', 'Pause'],
  ['Wheel', 'Zoom'],
];

export function Controls() {
  return (
    <dl className="controls">
      {CONTROLS.map(([key, action]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{action}</dd>
        </div>
      ))}
    </dl>
  );
}
