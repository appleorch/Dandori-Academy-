import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { ACESFilmicToneMapping, type Group } from 'three';
import type { Ending } from '../game/campaign/endings';
import { t } from '../i18n/i18n';
import type { MessageKey } from '../i18n/en';

/**
 * The Great Clock in the Academy courtyard: a brick tower, its face, and its hands. Whole and
 * turning when every part is home; still, its hands stopped at a quarter to twelve, when not.
 */
function GreatClock({ going }: { going: boolean }) {
  const hour = useRef<Group>(null);
  const minute = useRef<Group>(null);
  const rig = useRef<Group>(null);
  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    if (going) {
      if (minute.current) minute.current.rotation.z = -time * 0.9;
      if (hour.current) hour.current.rotation.z = -time * 0.075 - 1.2;
    }
    // The camera pulls back and rises over the courtyard, the grounds beyond.
    const pull = Math.min(1, time / 12);
    camera.position.set(Math.sin(time * 0.1) * (6 + pull * 14), 3 + pull * 9, 9 + pull * 20);
    camera.lookAt(0, 3.5 - pull * 1.5, 0);
    if (rig.current) rig.current.rotation.y = 0;
  });
  return (
    <group ref={rig}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 12, 8]} intensity={2.6} color="#ffe0b0" castShadow />
      {/* The courtyard and the four sections of the grounds beyond it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color="#5a7a3a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[7, 40]} />
        <meshStandardMaterial color="#b8a888" roughness={1} />
      </mesh>
      {[
        ['#6a9a4a', -26, -18],
        ['#3a7a6a', 26, -18],
        ['#5a4a6a', -26, 22],
        ['#9ac8d8', 26, 22],
      ].map(([colour, x, z]) => (
        <mesh
          key={colour as string}
          position={[x as number, 0.02, z as number]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[9, 24]} />
          <meshStandardMaterial color={colour as string} roughness={1} />
        </mesh>
      ))}
      {/* The tower. */}
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[3, 6, 3]} />
        <meshStandardMaterial color="#a8583a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 6.6, 0]} castShadow>
        <coneGeometry args={[2.4, 1.6, 4]} />
        <meshStandardMaterial color="#4a3a3a" roughness={0.8} />
      </mesh>
      {/* The face, and its hands. */}
      <group position={[0, 4.6, 1.52]}>
        <mesh>
          <circleGeometry args={[1.15, 40]} />
          <meshStandardMaterial color="#f4ecdc" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <ringGeometry args={[1.1, 1.22, 40]} />
          <meshStandardMaterial color="#d8a84a" metalness={0.7} roughness={0.3} />
        </mesh>
        <group ref={hour} rotation={[0, 0, -1.6]} position={[0, 0, 0.03]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.1, 0.6, 0.02]} />
            <meshStandardMaterial color="#2a1d14" />
          </mesh>
        </group>
        <group ref={minute} position={[0, 0, 0.05]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.06, 0.9, 0.02]} />
            <meshStandardMaterial color="#2a1d14" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * The story's ending: the Great Clock in the courtyard, the ending's words, then the credits
 * rolling. The grounds stay open afterwards for everything left to find.
 */
export function EndingScreen({ ending, onDone }: { ending: Ending; onDone: () => void }) {
  const [rolling, setRolling] = useState(false);
  const going = ending !== 'silent';
  return (
    <main className="screen ending-screen">
      <div className="ending-stage" aria-hidden="true">
        <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}>
          <color attach="background" args={[going ? '#f0c8a0' : '#6a7088']} />
          <fog attach="fog" args={[going ? '#f0c8a0' : '#6a7088', 30, 90]} />
          <GreatClock going={going} />
        </Canvas>
      </div>
      <div className="panel ending">
        <p className="eyebrow">{t('ending.eyebrow')}</p>
        <h1>{t(`ending.${ending}.title` as MessageKey)}</h1>
        {rolling ? (
          <div className="credits-roll">
            <h2>{t('credits.made')}</h2>
            <p>{t('credits.madeBody')}</p>
            <h2>{t('credits.tech')}</h2>
            <p>{t('credits.techBody')}</p>
            <h2>{t('credits.thanks')}</h2>
            <p>{t('credits.thanksBody')}</p>
            <p>{t('ending.postGame')}</p>
          </div>
        ) : (
          <p>{t(`ending.${ending}.text` as MessageKey)}</p>
        )}
        <button type="button" onClick={rolling ? onDone : () => setRolling(true)} autoFocus>
          {rolling ? t('ending.carryOn') : t('ending.credits')}
        </button>
      </div>
    </main>
  );
}
