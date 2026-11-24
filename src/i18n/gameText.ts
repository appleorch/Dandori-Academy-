import type { CampaignSection } from '../game/campaign/sections';
import { MODES, type ModeId } from '../game/modes/modes';
import type { Relic } from '../game/story/relics';
import { SPROUTS, type SproutKind } from '../game/workers/sprouts';
import type { LevelDefinition } from '../game/world/levelTypes';
import { content } from './i18n';

/**
 * The game's own text, kept with its data, looked up through the current language. Each piece
 * has a stable content key, so a language's content table can translate it; English is the data.
 */

export const levelName = (level: Pick<LevelDefinition, 'id' | 'name'>): string =>
  content(`level.${level.id}.name`, level.name);

export const levelBrief = (level: Pick<LevelDefinition, 'id' | 'brief'>): string =>
  content(`level.${level.id}.brief`, level.brief);

export const modeName = (mode: ModeId): string => content(`mode.${mode}.name`, MODES[mode].name);

export const modeSummary = (mode: ModeId): string =>
  content(`mode.${mode}.summary`, MODES[mode].summary);

export const modeRules = (mode: ModeId): string[] =>
  MODES[mode].rules.map((rule, i) => content(`mode.${mode}.rule.${i}`, rule));

export const relicName = (relic: Relic): string => content(`relic.${relic.id}.name`, relic.name);

export const relicDescription = (relic: Relic): string =>
  content(`relic.${relic.id}.description`, relic.description);

export const sectionName = (section: CampaignSection): string =>
  content(`section.${section.id}.name`, section.name);

export const sectionBrief = (section: CampaignSection): string =>
  content(`section.${section.id}.brief`, section.brief);

export const kindPlural = (kind: SproutKind): string =>
  content(`kind.${kind}.plural`, SPROUTS[kind].plural);

/**
 * A field's name as menus show it: a lesson with its number, a challenge field with its place,
 * anything else by name (see `fieldTitle` in ui/format.ts, which this translates).
 */
export function fieldName(level: LevelDefinition): string {
  const name = levelName(level);
  if (level.challenge) return `${level.challenge.order}. ${name}`;
  if (level.stage > 0 && !level.side) return `${level.stage}. ${name}`;
  return name;
}
