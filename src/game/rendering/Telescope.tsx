import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

/** The Observatory's great telescope: a brass tube on a tripod, pointed at the far glass. */
export function Telescope({ sim }: { sim: Simulation }) {
  const scope = sim.level.telescope;
  if (!scope) return null;
  const y = heightAt(sim.level, scope.x, scope.z);
  return (
    <group position={[scope.x, y, scope.z]}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.7, 1.1, Math.cos(a) * 0.7]}
            rotation={[Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35]}
            castShadow
          >
            <cylinderGeometry args={[0.07, 0.09, 2.4, 6]} />
            <meshStandardMaterial color="#6a4a2a" roughness={0.8} />
          </mesh>
        );
      })}
      <mesh position={[0.4, 2.5, 0.3]} rotation={[0.9, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.45, 3.4, 16]} />
        <meshStandardMaterial color="#d8a84a" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[0.4, 2.5, 0.3]} rotation={[0.9, 0.4, 0]}>
        <torusGeometry args={[0.48, 0.06, 8, 20]} />
        <meshStandardMaterial color="#8a5a2a" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}
