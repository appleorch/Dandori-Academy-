import { t } from '../i18n/i18n';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { ACESFilmicToneMapping, type Group } from 'three';
import { useGameStore } from '../game/core/gameStore';
import { RelicModel } from '../game/rendering/models/RelicModel';
import { allRelics, recoveredRelics, relicLocations, type Relic } from '../game/story/relics';
import { RELIC_SETS, setProgress } from '../game/story/relicSets';
import { relicNotes } from '../game/story/relicNotes';

/** Every relic in the cabinet: ordinary finds, bosses', the Clock's parts, secrets, the sets. */
const RELICS: readonly Relic[] = allRelics();
import { MenuNav } from './MenuNav';
import { SproutlingGuide } from './SquadRoster';
import { ENEMY_SPECS } from '../game/enemies/enemyKinds';
import { BESTIARY } from '../game/story/bestiary';

const MATERIAL_NAMES: Record<Relic['material'], string> = {
  brass: 'Brass',
  gold: 'Gold',
  silver: 'Silver',
  porcelain: 'Porcelain (fragile)',
  glass: 'Glass (fragile)',
  iron: 'Iron (heavy)',
  wood: 'Wood',
  crystal: 'Crystal',
};

/** A relic turning slowly on a little velvet stand. */
function Turntable({ relic, found }: { relic: Relic; found: boolean }) {
  const spin = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = clock.elapsedTime * 0.6;
  });
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <pointLight position={[-3, 1, 2]} intensity={6} color="#ffcf7a" />
      <group ref={spin} position={[0, 0.2, 0]}>
        {found ? (
          <RelicModel relic={relic} r={1} />
        ) : (
          <mesh>
            <icosahedronGeometry args={[0.9, 1]} />
            <meshStandardMaterial color="#2a2030" roughness={1} />
          </mesh>
        )}
      </group>
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 0.3, 40]} />
        <meshStandardMaterial color="#5a1a2a" roughness={0.9} />
      </mesh>
    </>
  );
}

/**
 * The Academy Field Guide: every Relic of Harmony, recovered or not. A recovered relic shows
 * its model, its name, what it is and where else it turns up; the rest are silhouettes.
 */
export function FieldGuide() {
  const collected = useGameStore((state) => state.save.treasuresCollected);
  const beatenList = useGameStore((state) => state.save.beastsBeaten);
  const beaten = useMemo(() => new Set<string>(beatenList), [beatenList]);
  const found = useMemo(() => recoveredRelics(collected), [collected]);
  const [chosen, setChosen] = useState<Relic>(
    () => RELICS.find((r) => found.has(r.id)) ?? RELICS[0],
  );
  const isFound = found.has(chosen.id);
  const places = useMemo(() => relicLocations(chosen.id), [chosen]);
  const notes = relicNotes(chosen);

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>{t('ui.fieldGuide.fieldGuide')}</h1>
        <p>
          {t('ui.fieldGuide.theRelicsOfHarmony')}
          {` ${t('ui.fieldGuide.ofRecovered', { size: found.size, length: RELICS.length })}`}
        </p>
        <section className="sprout-guide relic-sets">
          <h2>{t('ui.fieldGuide.relicSets')}</h2>
          <ul className="roster">
            {RELIC_SETS.map((relicSet) => {
              const got = setProgress(relicSet, found);
              return (
                <li
                  key={relicSet.id}
                  className={got === relicSet.relics.length ? 'home' : undefined}
                >
                  <strong>
                    {relicSet.name} · {got} {t('ui.fieldGuide.of')} {relicSet.relics.length}
                  </strong>
                  <small>
                    {got === relicSet.relics.length
                      ? `${t('ui.fieldGuide.complete')} `
                      : `${t('ui.fieldGuide.completeItFor')} `}
                    {relicSet.bonus}
                  </small>
                </li>
              );
            })}
          </ul>
        </section>
        <SproutlingGuide />
        <section className="sprout-guide">
          <h2>{t('ui.fieldGuide.beasts')}</h2>
          <ul className="roster">
            {BESTIARY.map(({ kind, note, warden, sprocket }) =>
              beaten.has(kind) ? (
                <li key={kind}>
                  <strong>{ENEMY_SPECS[kind].name}</strong>
                  <small>{note}</small>
                  {warden && (
                    <small>
                      {t('ui.fieldGuide.wardenSNote')} {warden}
                    </small>
                  )}
                  {sprocket && (
                    <small>
                      {t('ui.fieldGuide.theHeadmasterAdds')} {sprocket}
                    </small>
                  )}
                </li>
              ) : (
                <li key={kind} className="unknown">
                  <strong>{ENEMY_SPECS[kind].name}</strong>
                  <small>{t('ui.fieldGuide.notYetBeatenBeat')}</small>
                </li>
              ),
            )}
          </ul>
        </section>
        <div className="guide">
          <figure className="guide-stage">
            <div className="guide-canvas">
              <Canvas
                dpr={[1, 1.5]}
                camera={{ fov: 35, position: [0, 0.6, 5] }}
                gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
              >
                <Turntable relic={chosen} found={isFound} />
              </Canvas>
            </div>
            <figcaption>
              <strong>{isFound ? chosen.name : t('ui.fieldGuide.notYetRecovered')}</strong>
              <span className="guide-material">
                {isFound ? MATERIAL_NAMES[chosen.material] : '???'}
              </span>
              <p>
                {isFound
                  ? chosen.description
                  : chosen.id.startsWith('set-')
                    ? t('ui.fieldGuide.turnsUpInThe')
                    : chosen.id.startsWith('part-') || chosen.id.startsWith('secret-')
                      ? t('ui.fieldGuide.somewhereInTheStory')
                      : t('ui.fieldGuide.somewhereIn', {
                          v1: places.length > 0 ? places[0] : 'a lesson boss or mound',
                        })}
              </p>
              {isFound && places.length > 0 && (
                <small>
                  {t('ui.fieldGuide.foundIn')} {places.join(', ')}
                </small>
              )}
              {isFound && notes && (
                <>
                  <small>
                    {t('ui.fieldGuide.wardenSNote')} {notes.warden}
                  </small>
                  <small>
                    {t('ui.fieldGuide.theHeadmasterAdds')} {notes.sprocket}
                  </small>
                </>
              )}
            </figcaption>
          </figure>
          <ul className="guide-list">
            {RELICS.map((relic) => {
              const known = found.has(relic.id);
              return (
                <li key={relic.id}>
                  <button
                    type="button"
                    className={`guide-entry${relic.id === chosen.id ? ' chosen' : ''}${known ? '' : ' unknown'}`}
                    onClick={() => setChosen(relic)}
                    aria-pressed={relic.id === chosen.id}
                  >
                    <span className={`guide-swatch ${relic.material}`} aria-hidden="true" />
                    {known ? relic.name : '? ? ?'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
