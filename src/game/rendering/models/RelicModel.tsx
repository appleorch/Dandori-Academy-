import { useMemo } from 'react';
import { LatheGeometry, Vector2 } from 'three';
import type { Relic, RelicMaterial } from '../../story/relics';

/**
 * Models of the Relics of Harmony. Each is built from several parts around a small glowing
 * Sunshard, the piece of the relic the Kiln wants, and sized by `r`, the haul's radius.
 */

interface Finish {
  color: string;
  metalness: number;
  roughness: number;
  /** A second colour for trim and detail. */
  trim: string;
  transparent?: boolean;
}

const FINISH: Record<RelicMaterial, Finish> = {
  brass: { color: '#c89a48', metalness: 0.85, roughness: 0.3, trim: '#7a5420' },
  gold: { color: '#f2c64a', metalness: 0.95, roughness: 0.18, trim: '#b88a1a' },
  silver: { color: '#d8dce4', metalness: 0.9, roughness: 0.22, trim: '#8a90a0' },
  porcelain: { color: '#f8f4ec', metalness: 0, roughness: 0.25, trim: '#3a68b0' },
  glass: { color: '#d8f4ff', metalness: 0.1, roughness: 0.05, trim: '#7ab8d8', transparent: true },
  iron: { color: '#6a5a50', metalness: 0.6, roughness: 0.75, trim: '#a85a2a' },
  wood: { color: '#8a5a32', metalness: 0, roughness: 0.8, trim: '#d8a84a' },
  crystal: { color: '#ffd27a', metalness: 0.1, roughness: 0.1, trim: '#ff9a3a', transparent: true },
};

function Body({ finish, trim = false }: { finish: Finish; trim?: boolean }) {
  return finish.transparent && !trim ? (
    <meshPhysicalMaterial
      color={finish.color}
      transparent
      opacity={0.7}
      roughness={finish.roughness}
      clearcoat={1}
      envMapIntensity={2.2}
    />
  ) : (
    <meshStandardMaterial
      color={trim ? finish.trim : finish.color}
      metalness={finish.metalness}
      roughness={finish.roughness}
      envMapIntensity={1.4}
    />
  );
}

/** The Sunshard in every relic: small, faceted and glowing. */
function Core({ size, y = 0, z = 0 }: { size: number; y?: number; z?: number }) {
  return (
    <mesh position={[0, y, z]}>
      <octahedronGeometry args={[size]} />
      <meshBasicMaterial color={[3, 1.9, 0.6]} toneMapped={false} />
    </mesh>
  );
}

function Watch({ r, f }: { r: number; f: Finish }) {
  return (
    <group rotation={[-Math.PI / 2 + 0.5, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, r * 0.3, 32]} />
        <Body finish={f} />
      </mesh>
      <mesh position={[0, r * 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.92, r * 0.08, 8, 32]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[0, r * 0.155, 0]}>
        <cylinderGeometry args={[r * 0.84, r * 0.84, 0.01, 32]} />
        <meshStandardMaterial color="#f8f0dc" roughness={0.4} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin((i / 12) * Math.PI * 2) * r * 0.7,
            r * 0.17,
            Math.cos((i / 12) * Math.PI * 2) * r * 0.7,
          ]}
        >
          <boxGeometry args={[r * 0.04, 0.01, r * 0.12]} />
          <meshBasicMaterial color="#2a2018" />
        </mesh>
      ))}
      <mesh position={[r * 0.15, r * 0.18, -r * 0.1]} rotation={[0, 0.9, 0]}>
        <boxGeometry args={[r * 0.04, 0.01, r * 0.55]} />
        <meshBasicMaterial color="#2a2018" />
      </mesh>
      <mesh position={[0, 0, r * 1.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.12, r * 0.12, r * 0.25, 10]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[0, 0, r * 1.36]}>
        <torusGeometry args={[r * 0.2, r * 0.05, 6, 16]} />
        <Body finish={f} />
      </mesh>
      <Core size={r * 0.16} y={r * 0.22} />
    </group>
  );
}

function Acorn({ r, f }: { r: number; f: Finish }) {
  return (
    <group>
      <mesh position={[0, -r * 0.1, 0]} scale={[1, 1.2, 1]} castShadow>
        <sphereGeometry args={[r * 0.75, 24, 16]} />
        <Body finish={f} />
      </mesh>
      <mesh position={[0, r * 0.5, 0]} castShadow>
        <sphereGeometry args={[r * 0.82, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Body finish={f} trim />
      </mesh>
      {/* The cap's scales. */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 0.63) * r * 0.62, r * 0.75, Math.cos(i * 0.63) * r * 0.62]}
          scale={[1, 0.5, 1]}
        >
          <sphereGeometry args={[r * 0.16, 8, 6]} />
          <Body finish={f} trim />
        </mesh>
      ))}
      <mesh position={[0, r * 1.25, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[r * 0.06, r * 0.1, r * 0.4, 8]} />
        <meshStandardMaterial color="#5a3a1c" roughness={0.9} />
      </mesh>
      <Core size={r * 0.2} y={-r * 0.3} z={r * 0.62} />
    </group>
  );
}

function Teacup({ r, f }: { r: number; f: Finish }) {
  const cup = useMemo(
    () =>
      new LatheGeometry(
        [
          [0, 0],
          [0.45, 0],
          [0.55, 0.1],
          [0.82, 0.55],
          [0.92, 0.95],
          [0.86, 0.95],
          [0.76, 0.58],
          [0.0, 0.12],
        ].map(([x, y]) => new Vector2(x * r, y * r)),
        28,
      ),
    [r],
  );
  return (
    <group position={[0, -r * 0.45, 0]}>
      <mesh position={[0, r * 0.06, 0]} castShadow>
        <cylinderGeometry args={[r * 1.15, r * 0.9, r * 0.08, 32]} />
        <Body finish={f} />
      </mesh>
      <mesh geometry={cup} position={[0, r * 0.1, 0]} castShadow>
        <Body finish={f} />
      </mesh>
      {/* A painted band round the rim. */}
      <mesh position={[0, r * 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.88, r * 0.04, 6, 32]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[r * 0.95, r * 0.55, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[r * 0.25, r * 0.07, 8, 16, Math.PI * 1.4]} />
        <Body finish={f} />
      </mesh>
      <Core size={r * 0.22} y={r * 0.75} />
    </group>
  );
}

function Gear({ r, f }: { r: number; f: Finish }) {
  const teeth = 12;
  return (
    <group rotation={[Math.PI / 2 - 0.4, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[r * 0.72, r * 0.2, 10, 32]} />
        <Body finish={f} />
      </mesh>
      {Array.from({ length: teeth }, (_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, 0]}
            rotation={[0, 0, a]}
          >
            <boxGeometry args={[r * 0.28, r * 0.22, r * 0.3]} />
            <Body finish={f} />
          </mesh>
        );
      })}
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
          <boxGeometry args={[r * 1.4, r * 0.12, r * 0.14]} />
          <Body finish={f} trim />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.22, r * 0.22, r * 0.34, 16]} />
        <Body finish={f} trim />
      </mesh>
      <Core size={r * 0.18} z={r * 0.2} />
    </group>
  );
}

function Bell({ r, f }: { r: number; f: Finish }) {
  const shell = useMemo(
    () =>
      new LatheGeometry(
        [
          [0.95, 0],
          [0.9, 0.08],
          [0.7, 0.3],
          [0.6, 0.7],
          [0.5, 1.0],
          [0.2, 1.15],
          [0, 1.18],
        ].map(([x, y]) => new Vector2(x * r, y * r)),
        28,
      ),
    [r],
  );
  return (
    <group position={[0, -r * 0.55, 0]} rotation={[0, 0, 0.15]}>
      <mesh geometry={shell} castShadow>
        <Body finish={f} />
      </mesh>
      <mesh position={[0, r * 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.92, r * 0.06, 6, 28]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[0, r * 1.32, 0]}>
        <torusGeometry args={[r * 0.18, r * 0.06, 6, 16]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[0, r * 0.4, 0]}>
        <cylinderGeometry args={[r * 0.03, r * 0.03, r * 0.6, 6]} />
        <Body finish={f} trim />
      </mesh>
      <Core size={r * 0.2} y={r * 0.12} />
    </group>
  );
}

function Key({ r, f }: { r: number; f: Finish }) {
  return (
    <group rotation={[Math.PI / 2 - 0.3, 0, 0.5]}>
      <mesh position={[0, r * 0.75, 0]} castShadow>
        <torusGeometry args={[r * 0.38, r * 0.1, 8, 24]} />
        <Body finish={f} />
      </mesh>
      {/* Filigree inside the bow. */}
      <mesh position={[0, r * 0.75, 0]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[r * 0.2, r * 0.04, 6, 4]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[0, -r * 0.2, 0]} castShadow>
        <cylinderGeometry args={[r * 0.09, r * 0.09, r * 1.5, 10]} />
        <Body finish={f} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[r * 0.18, -r * (0.65 + i * 0.22), 0]}>
          <boxGeometry args={[r * 0.3, r * 0.12, r * 0.08]} />
          <Body finish={f} trim />
        </mesh>
      ))}
      <Core size={r * 0.17} y={r * 0.75} />
    </group>
  );
}

function MusicBox({ r, f }: { r: number; f: Finish }) {
  return (
    <group position={[0, -r * 0.2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[r * 1.5, r * 0.8, r * 1.0]} />
        <Body finish={f} />
      </mesh>
      {/* The lid, open, with a strip of brass along its edge. */}
      <group position={[0, r * 0.4, -r * 0.5]} rotation={[-1.1, 0, 0]}>
        <mesh position={[0, 0, r * 0.5]}>
          <boxGeometry args={[r * 1.52, r * 0.1, r * 1.0]} />
          <Body finish={f} />
        </mesh>
        <mesh position={[0, r * 0.06, r * 0.5]}>
          <boxGeometry args={[r * 1.2, r * 0.02, r * 0.7]} />
          <meshStandardMaterial color="#d8c08a" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      <mesh position={[r * 0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.04, r * 0.04, r * 0.25, 6]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[r * 0.92, r * 0.1, 0]}>
        <boxGeometry args={[r * 0.05, r * 0.3, r * 0.05]} />
        <Body finish={f} trim />
      </mesh>
      {/* Tiny dancer on her spindle, with the Sunshard for a heart. */}
      <mesh position={[0, r * 0.55, 0]}>
        <coneGeometry args={[r * 0.14, r * 0.3, 10]} />
        <meshStandardMaterial color="#f8e8e8" roughness={0.4} />
      </mesh>
      <Core size={r * 0.14} y={r * 0.78} />
    </group>
  );
}

function Orrery({ r, f }: { r: number; f: Finish }) {
  return (
    <group>
      <mesh position={[0, -r * 0.62, 0]}>
        <cylinderGeometry args={[r * 0.45, r * 0.6, r * 0.18, 20]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[0, -r * 0.3, 0]}>
        <cylinderGeometry args={[r * 0.05, r * 0.05, r * 0.6, 6]} />
        <Body finish={f} trim />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0.5 + i * 0.5, i * 1.1, 0.2 * i]} castShadow>
          <torusGeometry args={[r * (0.55 + i * 0.18), r * 0.035, 6, 32]} />
          <Body finish={f} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh
          key={i}
          position={[Math.cos(i * 2.4) * r * 0.75, i * r * 0.2, Math.sin(i * 2.4) * r * 0.75]}
        >
          <sphereGeometry args={[r * 0.1, 10, 8]} />
          <Body finish={f} trim />
        </mesh>
      ))}
      <Core size={r * 0.26} />
    </group>
  );
}

function Lantern({ r, f }: { r: number; f: Finish }) {
  return (
    <group position={[0, -r * 0.2, 0]}>
      <mesh position={[0, -r * 0.5, 0]}>
        <cylinderGeometry args={[r * 0.5, r * 0.55, r * 0.15, 6]} />
        <Body finish={f} trim />
      </mesh>
      <mesh position={[0, r * 0.62, 0]}>
        <coneGeometry args={[r * 0.55, r * 0.4, 6]} />
        <Body finish={f} trim />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * r * 0.45, 0.05 * r, Math.cos(a) * r * 0.45]}>
            <cylinderGeometry args={[r * 0.04, r * 0.04, r * 1.0, 5]} />
            <Body finish={f} trim />
          </mesh>
        );
      })}
      <mesh position={[0, 0.05 * r, 0]}>
        <cylinderGeometry args={[r * 0.42, r * 0.42, r * 0.95, 6]} />
        <meshPhysicalMaterial
          color="#fff2c8"
          transparent
          opacity={0.35}
          roughness={0.05}
          clearcoat={1}
        />
      </mesh>
      <mesh position={[0, r * 0.95, 0]}>
        <torusGeometry args={[r * 0.15, r * 0.04, 6, 14]} />
        <Body finish={f} trim />
      </mesh>
      <Core size={r * 0.26} y={r * 0.05} />
    </group>
  );
}

function Crystal({ r, f }: { r: number; f: Finish }) {
  return (
    <group position={[0, -r * 0.4, 0]}>
      <mesh position={[0, -r * 0.05, 0]} scale={[1, 0.35, 1]}>
        <dodecahedronGeometry args={[r * 0.6, 0]} />
        <meshStandardMaterial color="#6a6070" roughness={0.9} flatShading />
      </mesh>
      {[
        [0, 0, 0, 1.3],
        [0.35, 0.3, 0.3, 0.8],
        [-0.3, -0.2, -0.4, 0.9],
        [0.1, 0.4, -0.5, 0.6],
      ].map(([x, z, tilt, height], i) => (
        <mesh
          key={i}
          position={[x * r, height * r * 0.5, z * r]}
          rotation={[tilt, i, -tilt]}
          castShadow
        >
          <coneGeometry args={[r * 0.22, r * height, 6]} />
          <meshPhysicalMaterial
            color={f.color}
            emissive={f.trim}
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
            roughness={0.05}
            clearcoat={1}
            flatShading
          />
        </mesh>
      ))}
      <Core size={r * 0.18} y={r * 0.3} />
    </group>
  );
}

function Compass({ r, f }: { r: number; f: Finish }) {
  return (
    <group rotation={[-0.5, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[r * 0.9, r * 0.95, r * 0.25, 32]} />
        <Body finish={f} />
      </mesh>
      <mesh position={[0, r * 0.13, 0]}>
        <cylinderGeometry args={[r * 0.78, r * 0.78, 0.01, 32]} />
        <meshStandardMaterial color="#f0e6cc" roughness={0.5} />
      </mesh>
      {/* The rose: four points, north in red. */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, r * 0.14, 0]} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 2]}>
          <coneGeometry args={[r * 0.1, r * 1.2, 4]} />
          <meshStandardMaterial color={i === 0 ? '#b8281e' : '#2a2a30'} />
        </mesh>
      ))}
      <mesh position={[0, r * 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.82, r * 0.06, 6, 32]} />
        <Body finish={f} trim />
      </mesh>
      <Core size={r * 0.14} y={r * 0.24} />
    </group>
  );
}

function Thimble({ r, f }: { r: number; f: Finish }) {
  return (
    <group position={[0, -r * 0.55, 0]}>
      <mesh position={[0, r * 0.5, 0]} castShadow>
        <cylinderGeometry args={[r * 0.55, r * 0.68, r * 1.0, 24]} />
        <Body finish={f} />
      </mesh>
      <mesh position={[0, r * 1.0, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[r * 0.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Body finish={f} />
      </mesh>
      {/* Rows of tiny dimples. */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const row = Math.floor(i / 9);
        return (
          <mesh
            key={i}
            position={[
              Math.sin(a) * r * (0.6 - row * 0.04),
              r * (0.55 + row * 0.25),
              Math.cos(a) * r * (0.6 - row * 0.04),
            ]}
          >
            <sphereGeometry args={[r * 0.06, 6, 4]} />
            <Body finish={f} trim />
          </mesh>
        );
      })}
      <mesh position={[0, r * 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.68, r * 0.06, 6, 24]} />
        <Body finish={f} trim />
      </mesh>
      <Core size={r * 0.2} y={r * 1.25} />
    </group>
  );
}

const SHAPES = {
  watch: Watch,
  acorn: Acorn,
  teacup: Teacup,
  gear: Gear,
  bell: Bell,
  key: Key,
  musicbox: MusicBox,
  orrery: Orrery,
  lantern: Lantern,
  crystal: Crystal,
  compass: Compass,
  thimble: Thimble,
} as const;

/** One relic, centred on its middle, about `2r` across. A cracked one loses its gloss. */
export function RelicModel({
  relic,
  r,
  cracked = false,
}: {
  relic: Relic;
  r: number;
  cracked?: boolean;
}) {
  const Shape = SHAPES[relic.shape];
  const finish = FINISH[relic.material];
  const worn = cracked
    ? { ...finish, color: '#9fb0b8', roughness: 0.6, transparent: false }
    : finish;
  return <Shape r={r} f={worn} />;
}
