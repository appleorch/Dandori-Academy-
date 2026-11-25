import { t } from '../i18n/i18n';
import { startingKinds } from '../game/simulation/Simulation';
import { TWIN } from '../game/core/config';
import { bonusParts, shardCount, type LevelDefinition } from '../game/world/level';
import { twinRunes, twinStyle } from '../game/world/twins';
import { SPROUT_KINDS, SPROUTS, type SproutKind } from '../game/workers/sprouts';
import { KindGlyph } from './KindGlyph';
import { ActionPrompt } from './Glyph';
import type { Action } from '../game/commands/bindings';

const KIND_KEYS: readonly Action[] = ['kind1', 'kind2', 'kind3', 'kind4'];

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
    <ul className="roster" aria-label={t('ui.squadRoster.todaySSquad')}>
      {kinds.map(({ kind, count, grown }) => (
        <li key={kind} className={`kind ${kind}`}>
          <KindGlyph kind={kind} />
          <strong>
            {count > 0
              ? `${count} ${count === 1 ? SPROUTS[kind].name : SPROUTS[kind].plural}`
              : SPROUTS[kind].plural}
          </strong>
          <small>
            {SPROUTS[kind].knack}
            {count === 0 && grown ? ` ${t('ui.squadRoster.grownFromSeedPods')}` : ''}
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
      <h2>{t('ui.squadRoster.theSproutlings')}</h2>
      <p>{t('ui.squadRoster.theKilnGrowsFour')}</p>
      <ul className="roster">
        {SPROUT_KINDS.map((kind, i) => (
          <li key={kind} className={`kind ${kind}`}>
            <KindGlyph kind={kind} />
            <strong>
              {SPROUTS[kind].name} <ActionPrompt action={KIND_KEYS[i]} />
            </strong>
            <small>{SPROUTS[kind].knack}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * What a lesson holds besides its Sunshards, in plain words: twin pairs, each pair marked by
 * its own colour, shape and letter; Dewglass that cracks if dropped; Glowcaps that sprout late.
 */
export function OptionalTreasure({ level }: { level: LevelDefinition }) {
  const parts = bonusParts(level);
  const pairs = twinRunes(level).map((rune) => twinStyle(level, rune));
  return (
    <div className="optional-treasure">
      <p>
        <strong>{t('ui.squadRoster.required')}</strong> {shardCount(level)}{' '}
        {t('ui.squadRoster.sunshardsEveryOneHome')}
      </p>
      {pairs.length > 0 && (
        <p>
          <strong>{t('ui.squadRoster.twinPairs')}</strong>{' '}
          {pairs.length === 1
            ? t('ui.squadRoster.onePair')
            : t('ui.squadRoster.pairs', { length: pairs.length })}{' '}
          {t('ui.squadRoster.ofSunshardsEachPair')}{' '}
          {pairs.map((pair, i) => (
            <span key={pair.letter} className="twin-tag" style={{ color: pair.colour }}>
              {pair.letter} ({pair.shape}){i < pairs.length - 1 ? ', ' : ''}
            </span>
          ))}
          {t('ui.squadRoster.bringTheSecondHalf')} {TWIN.window}{' '}
          {t('ui.squadRoster.secondsOfTheFirst')}
        </p>
      )}
      {parts.dewglass > 0 && (
        <p>
          <strong>{t('ui.squadRoster.dewglass')}</strong> {parts.dewglass}{' '}
          {t('ui.squadRoster.fragile')} {parts.dewglass === 1 ? 'relic' : 'relics'}
          {t('ui.squadRoster.worthMoreIfHome')}
        </p>
      )}
      {parts.glowcaps > 0 && (
        <p>
          <strong>{t('ui.squadRoster.glowcaps')}</strong> {parts.glowcaps}{' '}
          {parts.glowcaps === 1 ? 'sprouts' : 'sprout'} {t('ui.squadRoster.laterInTheDay')}
        </p>
      )}
    </div>
  );
}
