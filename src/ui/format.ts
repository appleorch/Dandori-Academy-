/** Seconds as a countdown clock shows them, rounded up: 59.2 -> "1:00". */
export function formatTime(seconds: number): string {
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function formatPoints(points: number): string {
  return points.toLocaleString('en-US');
}

/**
 * A field's name as menus and banners show it: a lesson with its number, a challenge field
 * with its place in its challenge, and anything else (the story's grounds, a cave) by name.
 */
export function fieldTitle(level: {
  name: string;
  stage: number;
  side?: boolean;
  challenge?: { order: number };
}): string {
  if (level.challenge) return `${level.challenge.order}. ${level.name}`;
  if (level.stage > 0 && !level.side) return `${level.stage}. ${level.name}`;
  return level.name;
}
