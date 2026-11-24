import { useEffect, useState } from 'react';
import { perf } from '../game/rendering/perf';

/** How often the overlay's numbers are redrawn. */
const REFRESH_MS = 250;

/**
 * F3 during a day: frame rate, frame time, draw calls and triangles per frame, and the
 * simulation's time per frame, for checking performance on any device.
 */
export function PerfOverlay() {
  const [shown, setShown] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.code !== 'F3') return;
      event.preventDefault();
      setShown((value) => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setInterval(() => setTick((tick) => tick + 1), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [shown]);

  if (!shown) return null;
  return (
    <pre className="perf-overlay" aria-label="Performance">
      {`${perf.fps.toFixed(0)} fps  ${perf.frameMs.toFixed(1)} ms
draw calls ${perf.drawCalls}
triangles  ${(perf.triangles / 1000).toFixed(0)}k
sim ${perf.simMs.toFixed(2)} ms (${perf.steps} steps)`}
    </pre>
  );
}
