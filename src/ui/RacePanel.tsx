import type { RaceSnapshot } from '../game/modes/battle';

/** A tug-of-war bar: the player's share of what the two sides have between them. */
function Tug({ you, rival }: { you: number; rival: number }) {
  const total = you + rival;
  const share = total === 0 ? 0.5 : you / total;
  return (
    <span className="race-tug" aria-hidden="true">
      <span className="race-tug-you" style={{ width: `${share * 100}%` }} />
    </span>
  );
}

/**
 * The race against the rival, during a battle: both tallies, and in Bingo the player's card
 * with every ticked square, and how close each side is to a full line.
 */
export function RacePanel({ race }: { race: RaceSnapshot }) {
  const ahead = race.you === race.rival ? 'level' : race.you > race.rival ? 'ahead' : 'behind';
  return (
    <section className={`race ${ahead}`} aria-label="The race">
      <div className="race-row">
        <span className="race-side you">
          You <strong>{race.you}</strong>
          {race.goal !== null && race.card === null && <small>/{race.goal}</small>}
        </span>
        <Tug you={race.you} rival={race.rival} />
        <span className="race-side rival">
          <strong>{race.rival}</strong>
          {race.goal !== null && race.card === null && <small>/{race.goal}</small>} {race.rivalName}
        </span>
      </div>
      <p className="race-unit">
        {race.card
          ? `Best line: you ${race.youLine}/${race.goal ?? 0}, ${race.rivalName} ${race.rivalLine}/${race.goal ?? 0}`
          : race.unit}
      </p>
      {race.card && (
        <ol
          className="bingo-card"
          style={{ gridTemplateColumns: `repeat(${race.card.size}, 1fr)` }}
          aria-label="Your bingo card"
        >
          {race.card.squares.map((square, i) => (
            <li key={i} className={square.done ? 'done' : undefined}>
              {square.label}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
