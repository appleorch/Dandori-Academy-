import type { LevelDefinition } from '../world/level';

const WALL_HEIGHT = 2;
const LEG_ANGLES = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

/** The Kiln: a clay furnace on three legs. Hauls are delivered to the glowing ring beneath it. */
function KilnMesh({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {LEG_ANGLES.map((angle) => (
        <mesh
          key={angle}
          position={[Math.sin(angle) * 1.5, 1.1, Math.cos(angle) * 1.5]}
          rotation={[Math.cos(angle) * 0.25, 0, -Math.sin(angle) * 0.25]}
          castShadow
        >
          <cylinderGeometry args={[0.12, 0.18, 2.3, 8]} />
          <meshStandardMaterial color="#5b4636" />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]} castShadow>
        <sphereGeometry args={[1.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#b5653a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <cylinderGeometry args={[1.5, 1.2, 0.3, 24]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff7a1a" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.5, 40]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.7} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} color="#ff9a3c" intensity={12} distance={9} />
    </group>
  );
}

/** Static level geometry: ground, walls and the Kiln. */
export function Terrain({ level }: { level: LevelDefinition }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[level.width + 200, level.depth + 200]} />
        <meshStandardMaterial color="#27402f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[level.width, level.depth]} />
        <meshStandardMaterial color="#6f9a52" />
      </mesh>
      {level.obstacles.map((box) => (
        <mesh
          key={`${box.x}:${box.z}`}
          position={[box.x, WALL_HEIGHT / 2, box.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[box.w, WALL_HEIGHT, box.d]} />
          <meshStandardMaterial color="#8a8f98" roughness={0.95} />
        </mesh>
      ))}
      <KilnMesh x={level.kiln.x} z={level.kiln.z} />
    </group>
  );
}
