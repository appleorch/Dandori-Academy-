import { t } from '../i18n/i18n';
import { useState, type KeyboardEvent } from 'react';
import { DIFFICULTIES, HARD } from '../game/core/difficulty';
import { useGameStore } from '../game/core/gameStore';
import { bestClearTime, storyCleared } from '../game/save/saveManager';
import { formatTime } from './format';
import { CHAPTERS, chapterOf } from '../game/story/story';
import { entranceTo, forDifficulty, LEVELS, MAIN_LEVELS } from '../game/world/level';
import {
  ACADEMY,
  decorSpots,
  MAP_HEIGHT,
  MAP_WIDTH,
  NODES,
  REGIONS,
  regionPath,
  THEME_COLOURS,
  trailPath,
  type MapRegion,
} from './academyMap';
import { Controls } from './Controls';
import { lockReason, nextStoryLesson } from './lessonAccess';
import { MenuNav } from './MenuNav';
import { academyTime, timeMedal, type TimeMedal } from '../game/modes/timeAttack';
import { splitKey } from '../game/save/saveManager';

/** The badge colour of each time medal on the map. */
const MEDAL_COLOURS: Record<TimeMedal, string> = {
  Diamond: '#b8f0ff',
  Platinum: '#eceff6',
  Gold: '#ffd257',
  Silver: '#c8ccd4',
  Bronze: '#c88a52',
};
import { OptionalTreasure } from './SquadRoster';

const HARD_SUMMARY = `Enemies have ${Math.round((HARD.enemyHp - 1) * 100)}% more health and strike sooner, the Warden has ${HARD.captainHp} hearts, drips are deadly and the day is ${Math.round((1 - HARD.dayLength) * 100)}% shorter.`;

/** A small mark drawn across a region: what grows or stands there. */
function Decor({
  kind,
  x,
  y,
  ink,
}: {
  kind: MapRegion['decor'];
  x: number;
  y: number;
  ink: string;
}) {
  switch (kind) {
    case 'tree':
      return (
        <g transform={`translate(${x} ${y})`} opacity={0.55}>
          <rect x={-1.5} y={2} width={3} height={7} fill={ink} />
          <circle r={7} fill={ink} />
        </g>
      );
    case 'leaf':
      return (
        <path
          transform={`translate(${x} ${y}) rotate(${(x * 7) % 90})`}
          d="M0 -7 C6 -3 6 3 0 7 C-6 3 -6 -3 0 -7 Z"
          fill={ink}
          opacity={0.45}
        />
      );
    case 'reed':
      return (
        <g transform={`translate(${x} ${y})`} stroke={ink} strokeWidth={1.6} opacity={0.5}>
          <line x1={0} y1={8} x2={-3} y2={-8} />
          <line x1={2} y1={8} x2={4} y2={-6} />
          <ellipse cx={-3} cy={-8} rx={1.6} ry={3.2} fill={ink} />
        </g>
      );
    case 'star':
      return (
        <path
          transform={`translate(${x} ${y})`}
          d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
          fill={ink}
          opacity={0.45}
        />
      );
    case 'dome':
      return (
        <g
          transform={`translate(${x} ${y})`}
          fill="none"
          stroke={ink}
          strokeWidth={1.4}
          opacity={0.5}
        >
          <path d="M-8 6 A8 9 0 0 1 8 6 Z" />
          <line x1={0} y1={-3} x2={0} y2={6} />
        </g>
      );
    case 'rock':
      return <ellipse cx={x} cy={y} rx={6} ry={4} fill={ink} opacity={0.4} />;
  }
}

/** The Academy: towers round a glowing Kiln, with the Undercroft's door beneath. */
function Academy() {
  const { x, y } = ACADEMY;
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <ellipse cx={0} cy={34} rx={70} ry={16} fill="#00000022" />
      <rect
        x={-46}
        y={-14}
        width={92}
        height={46}
        rx={3}
        fill="#e9dcc0"
        stroke="#6b5636"
        strokeWidth={2}
      />
      <rect
        x={-58}
        y={-36}
        width={22}
        height={68}
        rx={2}
        fill="#dccba6"
        stroke="#6b5636"
        strokeWidth={2}
      />
      <rect
        x={36}
        y={-36}
        width={22}
        height={68}
        rx={2}
        fill="#dccba6"
        stroke="#6b5636"
        strokeWidth={2}
      />
      <path d="M-62 -36 L-47 -58 L-32 -36 Z" fill="#9a4a3a" stroke="#6b5636" strokeWidth={2} />
      <path d="M32 -36 L47 -58 L62 -36 Z" fill="#9a4a3a" stroke="#6b5636" strokeWidth={2} />
      <path d="M-30 -14 L0 -46 L30 -14 Z" fill="#b0563f" stroke="#6b5636" strokeWidth={2} />
      <circle cx={0} cy={6} r={11} fill="#ffb347" className="map-kiln" />
      <rect x={-8} y={18} width={16} height={14} rx={8} fill="#3a2e22" />
      <text x={0} y={-62} textAnchor="middle" className="map-academy-label">
        {t('ui.storyMap.theAcademy')}
      </text>
    </g>
  );
}

/**
 * The story: an illustrated map of the Academy grounds, one region a term, with every lesson
 * on the trail. Lessons open one at a time as the one before is cleared; caves appear once
 * their way down is found. Picking a lesson shows it beside the map.
 */
export function StoryMap() {
  const startDay = useGameStore((state) => state.startDay);
  const save = useGameStore((state) => state.save);
  const lastPlayed = useGameStore((state) => state.levelId);
  const difficulty = useGameStore((state) => state.settings.difficulty);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const next = nextStoryLesson(save, lastPlayed);
  const [selectedId, setSelectedId] = useState(next.id);
  const selected = forDifficulty(
    LEVELS.find((level) => level.id === selectedId) ?? next,
    difficulty,
  );
  const locked = lockReason(save, selected, difficulty);
  const chapter = chapterOf(selected.stage);
  const cleared = MAIN_LEVELS.filter((level) => storyCleared(save, level.id)).length;
  const hard = difficulty === 'hard';
  const academy = academyTime(
    MAIN_LEVELS.map((level) => ({ id: splitKey(level.id, difficulty) })),
    save.bestSplits,
  );
  /** The time medal of a lesson's fastest clear, or null if it is not cleared. */
  const medalOf = (level: (typeof LEVELS)[number]): TimeMedal | null => {
    const best = save.bestSplits[splitKey(level.id, difficulty)];
    if (!best || best.length === 0) return null;
    return timeMedal(forDifficulty(level, difficulty), best[best.length - 1]);
  };

  const visible = LEVELS.filter((level) => !level.side || save.discovered.includes(level.id));
  const trail = MAIN_LEVELS.map((level) => NODES[level.id]).filter(Boolean);
  const reached = (chapterId: string): boolean => {
    const term = CHAPTERS.find((candidate) => candidate.id === chapterId);
    return term !== undefined && save.stage >= term.from;
  };

  const choose = (id: string): void => setSelectedId(id);
  const onKey = (event: KeyboardEvent, id: string): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(id);
    }
  };

  return (
    <main className="screen">
      <div className="panel wide map-wide">
        <MenuNav />
        <div className="lesson-head">
          <h1>{t('ui.storyMap.timeAttack')}</h1>
          <span className="segmented" role="radiogroup" aria-label={t('ui.storyMap.difficulty')}>
            {DIFFICULTIES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={difficulty === option}
                className={difficulty === option ? `segment active ${option}` : 'segment'}
                onClick={() => updateSettings({ difficulty: option })}
              >
                {option === 'hard' ? t('ui.storyMap.hard') : t('ui.storyMap.normal')}
              </button>
            ))}
          </span>
        </div>
        <p className="map-status">
          <span>
            <strong>{cleared}</strong> {t('ui.storyMap.of')} {MAIN_LEVELS.length}{' '}
            {t('ui.storyMap.lessonsCleared')}
          </span>
          <span>{t('ui.storyMap.theAcademySLessons')}</span>
          {academy.lessons > 0 && (
            <span>
              {t('ui.storyMap.academyTime')} <strong>{formatTime(academy.seconds)}</strong>{' '}
              {t('ui.storyMap.over')} {academy.lessons}{' '}
              {academy.lessons === 1 ? 'lesson' : 'lessons'}
            </span>
          )}
        </p>
        <div className="story-map">
          <svg
            className="map"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            role="group"
            aria-label={t('ui.storyMap.mapOfTheAcademy')}
          >
            <defs>
              <radialGradient id="map-paper" cx="50%" cy="45%" r="75%">
                <stop offset="0%" stopColor="#f7eed8" />
                <stop offset="100%" stopColor="#dccaa0" />
              </radialGradient>
            </defs>
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} rx={18} fill="url(#map-paper)" />
            {REGIONS.map((region) => {
              const open = reached(region.chapter);
              const term = CHAPTERS.find((candidate) => candidate.id === region.chapter);
              return (
                <g key={region.chapter} className={open ? 'map-region' : 'map-region fogged'}>
                  <path
                    d={regionPath(region)}
                    fill={region.fill}
                    stroke={region.ink}
                    strokeOpacity={0.35}
                    strokeWidth={2}
                  />
                  {decorSpots(region, 16).map((spot, i) => (
                    <Decor key={i} kind={region.decor} x={spot.x} y={spot.y} ink={region.ink} />
                  ))}
                  <text
                    x={region.labelX}
                    y={region.labelY}
                    fill={region.ink}
                    className="map-region-label"
                  >
                    {open && term ? term.title : '???'}
                  </text>
                </g>
              );
            })}
            <path d={trailPath(trail)} className="map-trail" />
            {LEVELS.filter((level) => level.side && save.discovered.includes(level.id)).map(
              (level) => {
                const above = entranceTo(level.id);
                const from = above ? NODES[above.id] : undefined;
                const to = NODES[level.id];
                if (!from || !to) return null;
                return (
                  <line
                    key={level.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className="map-trail down"
                  />
                );
              },
            )}
            <Academy />
            {visible.map((level) => {
              const at = NODES[level.id];
              if (!at) return null;
              const shut = lockReason(save, level, 'normal') !== null;
              const done = storyCleared(save, level.id, difficulty);
              const current = level.id === next.id && !done;
              const classes = [
                'map-node',
                shut && 'locked',
                done && 'cleared',
                current && 'current',
                level.id === selectedId && 'selected',
                level.side && 'cave',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <g
                  key={level.id}
                  className={classes}
                  transform={`translate(${at.x} ${at.y})`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={level.id === selectedId}
                  aria-label={`${level.side ? 'Cave' : `Lesson ${level.stage}`}: ${shut ? 'locked' : level.name}${done ? ', cleared' : ''}`}
                  onClick={() => choose(level.id)}
                  onKeyDown={(event) => onKey(event, level.id)}
                >
                  {current && <circle r={24} className="map-node-pulse" />}
                  <circle r={17} fill={shut ? '#9c968a' : (THEME_COLOURS[level.theme] ?? '#777')} />
                  <text y={5} textAnchor="middle" className="map-node-number">
                    {shut ? '🔒' : level.side ? '▼' : level.stage}
                  </text>
                  {done && (
                    <g transform="translate(13 -13)">
                      <circle
                        r={8}
                        fill={MEDAL_COLOURS[medalOf(level) ?? 'Gold']}
                        stroke="#6b5636"
                        strokeWidth={1.5}
                      >
                        <title>{t('ui.storyMap.timeMedal', { v1: medalOf(level) ?? '' })}</title>
                      </circle>
                      <path d="M-4 0 L-1 3 L4 -3" fill="none" stroke="#3a2e22" strokeWidth={2} />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
          <aside className="map-panel" aria-live="polite">
            <p className="eyebrow">
              {selected.side ? t('ui.storyMap.below') : `${chapter.label} · ${chapter.title}`}
            </p>
            <h2>
              {selected.side ? '' : `${selected.stage}. `}
              {locked && !selected.side && selected.stage > save.stage
                ? t('ui.storyMap.aLessonNotYet')
                : selected.name}
            </h2>
            {locked ? (
              <p className="note warn">{locked}</p>
            ) : (
              <>
                <p>{selected.brief}</p>
                <OptionalTreasure level={selected} />
                <p className="map-cleared">
                  {storyCleared(save, selected.id, difficulty)
                    ? t('ui.storyMap.clearedBestTimePlay', {
                        v1: hard ? ' on Hard' : '',
                        v2: formatTime(bestClearTime(save, selected.id, difficulty) ?? 0),
                      })
                    : t('ui.storyMap.notClearedYet')}
                </p>
              </>
            )}
            {hard && <p className="note">{HARD_SUMMARY}</p>}
            <button
              type="button"
              disabled={locked !== null}
              onClick={() => startDay(selected.id, 'lessons')}
              autoFocus
            >
              {selected.id === next.id && save.story.day > 0
                ? t('ui.storyMap.continue')
                : t('ui.storyMap.playThisDay')}
            </button>
          </aside>
        </div>
        <details className="how-to" open={save.story.day === 0}>
          <summary>{t('ui.storyMap.controls')}</summary>
          <Controls />
        </details>
      </div>
    </main>
  );
}
