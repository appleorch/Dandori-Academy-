/** Seconds as a countdown clock shows them, rounded up: 59.2 -> "1:00". */
export function formatTime(seconds: number): string {
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function formatPoints(points: number): string {
  return points.toLocaleString('en-US');
}
