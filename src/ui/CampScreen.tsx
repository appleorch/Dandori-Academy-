import { useState } from 'react';
import {
  currentSection,
  dayParty,
  sectionProgress,
  stockTotal,
  type CampaignState,
} from '../game/campaign/campaign';
import { useGameStore } from '../game/core/gameStore';
import { relicFor } from '../game/story/relics';
import { SPROUT_KINDS } from '../game/workers/sprouts';
import type { Box } from '../game/navigation/NavGrid';
import { MenuNav } from './MenuNav';
import { t } from '../i18n/i18n';
import {
  kindPlural,
  relicDescription,
  relicName,
  sectionBrief,
  sectionName,
} from '../i18n/gameText';
import { KindGlyph } from './KindGlyph';

/** Map scale: pixels per world unit. */
const SCALE = 4;

/**
 * The section as the expedition knows it: what stands where, which parts are home and which
 * are still out, what has been opened up, and where the Kiln and the beacons are.
 */
function SectionMap({ state }: { state: CampaignState }) {
  const section = currentSection(state);
  const level = section.level;
  const done = new Set(state.done);
  const w = level.width * SCALE;
  const h = level.depth * SCALE;
  const px = (x: number) => (x + level.width / 2) * SCALE;
  const pz = (z: number) => (z + level.depth / 2) * SCALE;
  const rect = (box: Box, key: string, className: string) => (
    <rect
      key={key}
      className={className}
      x={px(box.x - box.w / 2)}
      y={pz(box.z - box.d / 2)}
      width={box.w * SCALE}
      height={box.d * SCALE}
    />
  );
  return (
    <svg
      className="camp-map"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={t('camp.mapLabel', { section: sectionName(section) })}
    >
      <rect x={0} y={0} width={w} height={h} className="camp-ground" />
      {(level.plateaus ?? []).map((p, i) => rect(p, `p${i}`, 'camp-plateau'))}
      {(level.water ?? []).map((box, i) => rect(box, `w${i}`, 'camp-water'))}
      {(level.bridges ?? []).map((box, i) =>
        rect(box, `b${i}`, done.has(`bridge:${i}`) ? 'camp-bridge' : 'camp-water'),
      )}
      {level.obstacles.map((box, i) => rect(box, `o${i}`, 'camp-wall'))}
      {(level.gates ?? []).map((gate, i) =>
        done.has(`gate:${i}`)
          ? null
          : rect(gate, `g${i}`, gate.style === 'crystal' ? 'camp-gate crystal' : 'camp-gate'),
      )}
      {(level.beacons ?? []).map((beacon, i) => (
        <circle
          key={`l${i}`}
          cx={px(beacon.x)}
          cy={pz(beacon.z)}
          r={done.has(`beacon:${i}`) ? 9 : 6}
          className={done.has(`beacon:${i}`) ? 'camp-beacon lit' : 'camp-beacon'}
        />
      ))}
      {level.treasures
        .filter((t) => !t.id.startsWith('part-') && !done.has(`treasure:${t.id}`))
        .map((t) => (
          <circle key={t.id} cx={px(t.x)} cy={pz(t.z)} r={3} className="camp-relic" />
        ))}
      {section.parts.map((id) => {
        const part = level.treasures.find((t) => t.id === id);
        if (!part) return null;
        const home = state.parts[id] !== undefined;
        return (
          <g key={id} transform={`translate(${px(part.x)} ${pz(part.z)})`}>
            <title>
              {relicName(relicFor(level.id, id))}
              {home ? ` ${t('camp.partHomeOn', { day: state.parts[id] })}` : ''}
            </title>
            <circle r={9} className={home ? 'camp-part home' : 'camp-part'} />
            <path d="M0 -5 L0 0 L4 2" className="camp-part-hand" />
          </g>
        );
      })}
      <circle cx={px(level.kiln.x)} cy={pz(level.kiln.z)} r={12} className="camp-kiln" />
      <text
        x={px(level.kiln.x)}
        y={pz(level.kiln.z) - 18}
        textAnchor="middle"
        className="camp-label"
      >
        {t('camp.kilnMark')}
      </text>
    </svg>
  );
}

/**
 * The story's base camp, between days: the section and how much of it is done, the Kiln's
 * stock for tomorrow, the Great Clock's parts, and the way into the next day.
 */
export function CampScreen() {
  const state = useGameStore((store) => store.save.campaign);
  const startDay = useGameStore((store) => store.startDay);
  const restartCampaign = useGameStore((store) => store.restartCampaign);
  const [confirming, setConfirming] = useState(false);
  const section = currentSection(state);
  const progress = sectionProgress(state);
  const total = stockTotal(state.stock);
  const party = dayParty(state.stock);
  const going = SPROUT_KINDS.reduce((sum, kind) => sum + (party[kind] ?? 0), 0);

  return (
    <main className="screen">
      <div className="panel wide map-wide">
        <MenuNav />
        <div className="lesson-head">
          <h1>{t('camp.title')}</h1>
          <span className="camp-day">{t('camp.day', { day: state.day + 1 })}</span>
        </div>
        <p className="map-status">
          <span>{t('camp.partsHome', { count: progress.parts, total: progress.partsTotal })}</span>
          <span>{t('camp.relics', { count: progress.relics, total: progress.relicsTotal })}</span>
          <span>{t('camp.beasts', { count: progress.beasts, total: progress.beastsTotal })}</span>
          <span>
            {t('camp.losses', { lost: state.totals.lost, night: state.totals.leftBehind })}
          </span>
        </p>
        <div className="story-map">
          <SectionMap state={state} />
          <aside className="map-panel" aria-live="polite">
            <p className="eyebrow">{t('camp.eyebrow')}</p>
            <h2>{sectionName(section)}</h2>
            {state.finished !== null ? (
              <p className="best">{t('camp.finished', { day: state.finished })}</p>
            ) : (
              <p>{sectionBrief(section)}</p>
            )}
            <div className="camp-stock" aria-label={t('camp.kilnLabel')}>
              <p className="eyebrow">{t('camp.kiln')}</p>
              <ul>
                {SPROUT_KINDS.map((kind) => (
                  <li key={kind} className={state.stock[kind] > 0 ? kind : `${kind} none`}>
                    <KindGlyph kind={kind} /> {state.stock[kind]} {kindPlural(kind)}
                  </li>
                ))}
              </ul>
              {total === 0 && <p className="note warn">{t('camp.kilnEmpty')}</p>}
              {going < total && (
                <p className="note">{t('camp.overflow', { going, waiting: total - going })}</p>
              )}
            </div>
            <button type="button" onClick={() => startDay(section.level.id, 'campaign')} autoFocus>
              {state.day === 0 ? t('camp.begin') : t('camp.startDay', { day: state.day + 1 })}
            </button>
            <p className="note">{t('camp.sunsetNote')}</p>
          </aside>
        </div>
        <section className="camp-parts">
          <h2>{t('camp.clock')}</h2>
          <ol>
            {section.parts.map((id) => {
              const relic = relicFor(section.level.id, id);
              const day = state.parts[id];
              return (
                <li key={id} className={day !== undefined ? 'home' : undefined}>
                  <strong>{day !== undefined ? relicName(relic) : t('camp.missingPart')}</strong>
                  <small>
                    {day !== undefined
                      ? t('camp.partHome', { description: relicDescription(relic), day })
                      : t('camp.stillOut')}
                  </small>
                </li>
              );
            })}
          </ol>
        </section>
        {state.day > 0 && (
          <details className="how-to">
            <summary>{t('camp.startOver')}</summary>
            {confirming ? (
              <>
                <p className="note warn">{t('camp.startOverWarning')}</p>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    restartCampaign();
                    setConfirming(false);
                  }}
                >
                  {t('camp.startOverConfirm')}
                </button>
                <button type="button" className="secondary" onClick={() => setConfirming(false)}>
                  {t('camp.keepGoing')}
                </button>
              </>
            ) : (
              <button type="button" className="secondary" onClick={() => setConfirming(true)}>
                {t('camp.startOverAsk')}
              </button>
            )}
          </details>
        )}
      </div>
    </main>
  );
}
