import { startingKinds } from '../game/simulation/Simulation';
import { bonusParts, shardCount, type LevelDefinition } from '../game/world/level';
import { SPROUT_KINDS, SPROUTS, type SproutKind } from '../game/workers/sprouts';

/** Every kind of Sproutling the lesson starts with or can grow from its seed pods. */
function kindsOf(level: LevelDefinition): { kind: SproutKind; count: number; grown: boolean }[] {
  const start = startingKinds(level);
  const pods = new Set(level.pods.flatMap((pod) => (pod.kind ? [pod.kind] : [])));
  return SPROUT_KINDS.flatMap((kind) => {
    const count = start.filter((candidate) => candidate === kind).length;
    return count > 0 || pods.has(kind) ? [{ kind, count, grown: pods.has(kind) }] : [];
  });
}

/** The squad a lesson starts with, by kind, each with its knack. */
export function SquadRoster({ level }: { level: LevelDefinition }) {
  const kinds = kindsOf(level);
  return (
    <ul className="roster" aria-label="Today's squad">
      {kinds.map(({ kind, count, grown }) => (
        <li key={kind} className={`kind ${kind}`}>
          <span className="dot" />
          <strong>
            {count > 0
              ? `${count} ${count === 1 ? SPROUTS[kind].name : SPROUTS[kind].plural}`
              : SPROUTS[kind].plural}
          </strong>
          <small>
            {SPROUTS[kind].knack}
            {count === 0 && grown ? ' Grown from seed pods today.' : ''}
          </small>
        </li>
      ))}
    </ul>
  );
}

/** All four kinds, for the Field Guide. */
export function SproutlingGuide() {
  return (
    <section className="sprout-guide">
      <h2>The Sproutlings</h2>
      <p>
        The Kiln grows four kinds. A seed pod grows its own kind; anything else grows whichever kind
        carried it home.
      </p>
      <ul className="roster">
        {SPROUT_KINDS.map((kind, i) => (
          <li key={kind} className={`kind ${kind}`}>
            <span className="dot" />
            <strong>
              {SPROUTS[kind].name} <kbd>{i + 1}</kbd>
            </strong>
            <small>{SPROUTS[kind].knack}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The lesson's treasure, said plainly: what is required, what counts as bonus, what is extra. */
export function OptionalTreasure({ level }: { level: LevelDefinition }) {
  const parts = bonusParts(level);
  const bonus = [
    parts.twins > 0
      ? `${parts.twins} twin ${parts.twins === 1 ? 'pair' : 'pairs'} (both halves home within 10 seconds)`
      : null,
    parts.dewglass > 0 ? `${parts.dewglass} Dewglass (home without cracking)` : null,
  ].filter((item) => item !== null);
  const bonusWorth = parts.twinPoints + parts.dewglassPoints;
  return (
    <p className="optional-treasure">
      <strong>Required:</strong> {shardCount(level)} Sunshards.{' '}
      {bonus.length > 0 && (
        <>
          <strong>Bonus:</strong> {bonus.join(', ')}, worth up to {bonusWorth} points; the rank
          targets assume you take them.{' '}
        </>
      )}
      {parts.glowcaps > 0 && (
        <>
          <strong>Extra:</strong> {parts.glowcaps}{' '}
          {parts.glowcaps === 1 ? 'Glowcap sprouts' : 'Glowcaps sprout'} later in the day (worth up
          to {parts.glowcapPoints} points). Glowcaps add to your score but never to your rank, so
          Diamond never waits for one.
        </>
      )}
      {bonus.length === 0 && parts.glowcaps === 0 && (
        <>No bonus treasure here: the rank is all Sunshards, Sproutlings and time.</>
      )}
    </p>
  );
}
