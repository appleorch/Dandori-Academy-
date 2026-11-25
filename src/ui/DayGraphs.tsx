import { useState } from 'react';
import { formatTime } from './format';

/** Seconds between the timeline's samples (Simulation's TIMELINE_EVERY at 60 steps a second). */
const SAMPLE_SECONDS = 5;
const W = 260;
const H = 84;
const PAD = { left: 26, right: 8, top: 8, bottom: 18 };

/**
 * One measure over the day as a small line chart: one series, so no legend (the title names
 * it), a recessive axis, a crosshair and readout under the pointer, and a table for screen
 * readers. Two of these sit side by side rather than one chart with two scales.
 */
function DayChart({
  title,
  values,
  tone,
  unit,
}: {
  title: string;
  values: readonly number[];
  tone: 'field' | 'home';
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (values.length < 2) return null;
  const top = Math.max(1, ...values);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (values.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const area = `${path.join(' ')} L${x(values.length - 1)},${PAD.top + plotH} L${PAD.left},${PAD.top + plotH} Z`;
  const end = values.length - 1;
  const pick = (clientX: number, rect: DOMRect) => {
    const at = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((at - PAD.left) / plotW) * end);
    setHover(Math.max(0, Math.min(end, i)));
  };
  return (
    <figure className={`day-chart ${tone}`}>
      <figcaption>{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: from ${values[0]} to ${values[end]} ${unit}`}
        onPointerMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
      >
        <line
          className="axis"
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
        />
        <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} />
        <text className="tick" x={PAD.left - 4} y={PAD.top + 4} textAnchor="end">
          {top}
        </text>
        <text className="tick" x={PAD.left - 4} y={PAD.top + plotH + 3} textAnchor="end">
          0
        </text>
        <text className="tick" x={W - PAD.right} y={H - 4} textAnchor="end">
          {formatTime(end * SAMPLE_SECONDS)}
        </text>
        <path className="fill" d={area} />
        <path className="line" d={path.join(' ')} />
        <circle className="end" cx={x(end)} cy={y(values[end])} r={4} />
        {hover !== null && (
          <g className="crosshair">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} />
            <circle cx={x(hover)} cy={y(values[hover])} r={4} />
            <text
              x={Math.min(W - PAD.right, Math.max(PAD.left + 30, x(hover)))}
              y={PAD.top + 10}
              textAnchor="middle"
            >
              {formatTime(hover * SAMPLE_SECONDS)}: {values[hover]}
            </text>
          </g>
        )}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {values.map((v, i) => (
            <tr key={i}>
              <th scope="row">{formatTime(i * SAMPLE_SECONDS)}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** The day as it went: Sproutlings on the field, and hauls brought home. */
export function DayGraphs({
  timeline,
}: {
  timeline: { field: readonly number[]; home: readonly number[] };
}) {
  if (timeline.field.length < 2) return null;
  return (
    <div className="day-graphs" aria-label="The day as it went">
      <DayChart title="Sproutlings on the field" values={timeline.field} tone="field" unit="" />
      <DayChart title="Treasure home" values={timeline.home} tone="home" unit="" />
    </div>
  );
}
