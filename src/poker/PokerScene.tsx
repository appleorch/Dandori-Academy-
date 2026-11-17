import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  Fog,
  LinearFilter,
  MathUtils,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type PointLight,
  type Sprite,
} from 'three';
import { backTexture, faceTexture } from './cardTextures';
import type { Card } from './cards';
import type { PokerGame } from './game';
import {
  around,
  PLAYERS,
  SEAT_RADIUS,
  TABLE_RADIUS,
  TABLE_TOP,
  type Disguise,
  type Player,
} from './table';

/** What the table shows beyond the rules: tells, speech and who just won. Mutated by the room. */
export interface TableView {
  /** How brightly each seat's ember burns, 0 to 1. */
  glow: number[];
  /** What each seat is saying, and until when (in `performance.now()` milliseconds). */
  speech: { text: string; until: number }[];
  winners: number[];
}

const CARD_W = 0.25;
const CARD_H = 0.35;
const CARD_Y = TABLE_TOP + 0.012;
const EYE = new Vector3(0, 1.62, 2.95);
const LOOK = new Vector3(0, 0.98, -0.3);
/** Where cards are dealt from: the middle of the table. */
const DECK: [number, number, number] = [0, CARD_Y + 0.05, 0.1];
const ease = (t: number): number => 1 - (1 - t) ** 3;

/** Where a seat is on the floor plan. Seat 0 is the Warden; the rest are the regulars. */
function seatAngle(seat: number): number {
  return seat === 0 ? 0 : PLAYERS[seat - 1].angle;
}

interface CardProps {
  card: Card;
  faceUp: boolean;
  position: [number, number, number];
  /** Turn about the vertical axis, so a card can face its owner. */
  yaw: number;
  /** How far a face-up card leans back from flat towards upright. */
  lean?: number;
  /** Seconds to wait before it leaves the deck. */
  delay?: number;
  scale?: number;
}

/** One card. It slides out from the deck when it first appears and turns over when revealed. */
function CardMesh({ card, faceUp, position, yaw, lean = 0, delay = 0, scale = 1 }: CardProps) {
  const group = useRef<Group>(null);
  const born = useRef<number | null>(null);
  const flip = useRef(Math.PI / 2);
  const materials = useMemo(() => ({ face: faceTexture(card), back: backTexture() }), [card]);

  useFrame(({ clock }, delta) => {
    const node = group.current;
    if (!node) return;
    born.current ??= clock.elapsedTime;
    const t = ease(MathUtils.clamp((clock.elapsedTime - born.current - delay) / 0.32, 0, 1));
    node.visible = clock.elapsedTime - born.current >= delay;
    node.position.set(
      MathUtils.lerp(DECK[0], position[0], t),
      MathUtils.lerp(DECK[1], position[1], t) + Math.sin(t * Math.PI) * 0.12,
      MathUtils.lerp(DECK[2], position[2], t),
    );
    const target = faceUp ? -Math.PI / 2 + lean : Math.PI / 2;
    flip.current += (target - flip.current) * Math.min(1, delta * 9);
    node.rotation.set(flip.current, yaw * t, 0, 'YXZ');
  });

  return (
    <group ref={group} scale={scale} visible={false}>
      <mesh castShadow>
        <boxGeometry args={[CARD_W, CARD_H, 0.004]} />
        <meshStandardMaterial attach="material-0" color="#e8e0d0" />
        <meshStandardMaterial attach="material-1" color="#e8e0d0" />
        <meshStandardMaterial attach="material-2" color="#e8e0d0" />
        <meshStandardMaterial attach="material-3" color="#e8e0d0" />
        <meshStandardMaterial
          attach="material-4"
          map={materials.face}
          color="#c9c2b4"
          roughness={0.7}
        />
        <meshStandardMaterial
          attach="material-5"
          map={materials.back}
          color="#d8d0c4"
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

const DENOMINATIONS: readonly (readonly [number, string])[] = [
  [1000, '#e8b83a'],
  [500, '#7a4ac0'],
  [100, '#1c1c22'],
  [25, '#2e8a4a'],
  [5, '#c8382a'],
];
const CHIP_HEIGHT = 0.014;
const CHIP_RADIUS = 0.05;

/** A pile of chips worth `amount`: one column per denomination, tallest value first. */
function Chips({ amount, position }: { amount: number; position: [number, number, number] }) {
  const columns = useMemo(() => {
    const stacks: { color: string; count: number }[] = [];
    let rest = amount;
    for (const [value, color] of DENOMINATIONS) {
      const count = Math.floor(rest / value);
      rest -= count * value;
      if (count > 0) stacks.push({ color, count: Math.min(count, 24) });
    }
    return stacks;
  }, [amount]);
  if (amount <= 0) return null;
  return (
    <group position={position}>
      {columns.map(({ color, count }, i) => {
        const x = (i - (columns.length - 1) / 2) * CHIP_RADIUS * 2.2;
        return (
          <group key={color} position={[x, 0, (i % 2) * 0.04]}>
            <mesh position={[0, (count * CHIP_HEIGHT) / 2, 0]} castShadow>
              <cylinderGeometry args={[CHIP_RADIUS, CHIP_RADIUS, count * CHIP_HEIGHT, 18]} />
              <meshStandardMaterial color={color} roughness={0.45} />
            </mesh>
            <mesh position={[0, count * CHIP_HEIGHT + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[CHIP_RADIUS * 0.55, CHIP_RADIUS * 0.8, 18]} />
              <meshBasicMaterial color="#f4ecd8" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

interface LabelProps {
  position: [number, number, number];
  /** Called every frame; the canvas is redrawn only when the lines change. */
  getLines: () => readonly string[];
  scale?: number;
}

/** A small sign that always faces the Warden: a name, a stack, and whatever was just said. */
function Label({ position, getLines, scale = 1 }: LabelProps) {
  const sprite = useRef<Sprite>(null);
  const shown = useRef('');
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const created = new CanvasTexture(canvas);
    created.colorSpace = SRGBColorSpace;
    created.minFilter = LinearFilter;
    created.generateMipmaps = false;
    return created;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const lines = getLines();
    const key = lines.join('\n');
    if (key === shown.current) return;
    shown.current = key;
    const canvas = texture.image as HTMLCanvasElement;
    const ink = canvas.getContext('2d');
    if (!ink) return;
    ink.clearRect(0, 0, canvas.width, canvas.height);
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    lines.forEach((line, i) => {
      if (!line) return;
      const y = 34 + i * 60;
      ink.font = i === 0 ? '700 40px system-ui, sans-serif' : '600 34px system-ui, sans-serif';
      const width = Math.min(500, ink.measureText(line).width + 36);
      ink.fillStyle = i === 2 ? 'rgba(255, 246, 220, 0.94)' : 'rgba(18, 12, 10, 0.72)';
      ink.beginPath();
      ink.roundRect(256 - width / 2, y - 27, width, 54, 16);
      ink.fill();
      ink.fillStyle = i === 2 ? '#2a1a10' : i === 0 ? '#ffe6b0' : '#fff6dc';
      ink.fillText(line, 256, y + 2, 480);
    });
    texture.needsUpdate = true;
    if (sprite.current) sprite.current.visible = key.length > 0;
  });

  return (
    <sprite ref={sprite} position={position} scale={[1.5 * scale, 0.5625 * scale, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}

/** A hat, a moustache, a monocle: whatever this one believes makes it unrecognisable. */
function DisguiseParts({ kind }: { kind: Disguise }) {
  if (kind === 'fedora') {
    return (
      <>
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.025, 24]} />
          <meshStandardMaterial color="#2c2c34" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.46, 0]} castShadow>
          <cylinderGeometry args={[0.19, 0.23, 0.2, 20]} />
          <meshStandardMaterial color="#34343e" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.39, 0]}>
          <cylinderGeometry args={[0.235, 0.235, 0.05, 20]} />
          <meshStandardMaterial color="#8a1c1c" roughness={0.6} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.075, -0.02, 0.285]}
            rotation={[0, 0, side * 0.5 + Math.PI / 2]}
          >
            <capsuleGeometry args={[0.028, 0.1, 4, 8]} />
            <meshStandardMaterial color="#1c1410" roughness={1} />
          </mesh>
        ))}
      </>
    );
  }
  if (kind === 'contessa') {
    return (
      <>
        <mesh position={[0, 0.34, 0]} rotation={[0.12, 0, 0.08]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.02, 28]} />
          <meshStandardMaterial color="#e9dcc8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.12, 20]} />
          <meshStandardMaterial color="#e9dcc8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.225, 0.225, 0.04, 20]} />
          <meshStandardMaterial color="#b04a8a" roughness={0.6} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.1, 0.1, 0.27]} scale={[1, 0.85, 0.4]}>
            <sphereGeometry args={[0.085, 14, 10]} />
            <meshStandardMaterial color="#0c0c10" roughness={0.1} metalness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.1, 0.29]}>
          <boxGeometry args={[0.06, 0.015, 0.015]} />
          <meshStandardMaterial color="#0c0c10" />
        </mesh>
        {Array.from({ length: 11 }, (_, i) => {
          const a = ((i - 5) / 5) * 1.25;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 0.27, -0.16 - Math.cos(a) * 0.03, Math.cos(a) * 0.25]}
            >
              <sphereGeometry args={[0.026, 8, 6]} />
              <meshStandardMaterial color="#fbf6ea" roughness={0.2} metalness={0.3} />
            </mesh>
          );
        })}
      </>
    );
  }
  if (kind === 'cowboy') {
    return (
      <>
        <mesh position={[0, 0.35, 0]} scale={[1, 0.35, 0.8]} castShadow>
          <torusGeometry args={[0.36, 0.09, 8, 28]} />
          <meshStandardMaterial color="#8a5a2c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.02, 24]} />
          <meshStandardMaterial color="#8a5a2c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.47, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, 0.24, 18]} />
          <meshStandardMaterial color="#9a6632" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.14, 0.2]} rotation={[0.5, 0, Math.PI]}>
          <coneGeometry args={[0.2, 0.26, 3]} />
          <meshStandardMaterial color="#c8281e" roughness={0.8} />
        </mesh>
        <mesh position={[0.1, -0.04, 0.3]} rotation={[0, 0, 1.4]}>
          <cylinderGeometry args={[0.008, 0.008, 0.22, 5]} />
          <meshStandardMaterial color="#d8c88a" />
        </mesh>
      </>
    );
  }
  if (kind === 'professor') {
    return (
      <>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.02, 24]} />
          <meshStandardMaterial color="#16161c" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.54, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.19, 0.38, 20]} />
          <meshStandardMaterial color="#1c1c24" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.39, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 20]} />
          <meshStandardMaterial color="#3a5a8a" roughness={0.6} />
        </mesh>
        <mesh position={[0.1, 0.09, 0.285]}>
          <torusGeometry args={[0.075, 0.012, 6, 20]} />
          <meshStandardMaterial color="#e8c860" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0.2, -0.04, 0.24]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.004, 0.004, 0.26, 4]} />
          <meshStandardMaterial color="#e8c860" metalness={0.8} roughness={0.3} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.07, -0.17, 0.27]}
            rotation={[0, 0, side * (Math.PI / 2)]}
          >
            <coneGeometry args={[0.055, 0.12, 4]} />
            <meshStandardMaterial color="#8a1c3a" roughness={0.6} />
          </mesh>
        ))}
      </>
    );
  }
  // A Mossback suit: a mossy hood with two painted eyes, worn low.
  return (
    <>
      <mesh position={[0, 0.16, -0.04]} scale={[1.25, 0.95, 1.25]} castShadow>
        <sphereGeometry args={[0.32, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5f8a3e" roughness={1} flatShading side={2} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.sin(i * 1.4) * 0.22, 0.42, Math.cos(i * 1.4) * 0.2 - 0.06]}>
          <coneGeometry args={[0.05, 0.14, 5]} />
          <meshStandardMaterial color={i % 2 ? '#4f8a3c' : '#7fb04f'} roughness={1} flatShading />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.14, 0.38, 0.28]}>
          <mesh>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color="#fff6dc" roughness={0.3} />
          </mesh>
          <mesh position={[side * 0.015, -0.02, 0.055]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#1c1410" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.2, 0.39]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.3, 0.03, 0.02]} />
        <meshStandardMaterial color="#3a2a1c" />
      </mesh>
    </>
  );
}

interface RegularProps {
  player: Player;
  seat: number;
  game: PokerGame;
  view: TableView;
}

/** One of the regulars: an Emberling on a tall stool, wearing what it thinks is a disguise. */
function Regular({ player, seat, game, view }: RegularProps) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const ember = useRef<MeshStandardMaterial>(null);
  const emberLight = useRef<PointLight>(null);
  const [x, z] = around(player.angle, SEAT_RADIUS);
  const facing = player.angle + Math.PI;
  const turn = useRef(facing);
  const phase = seat * 1.7;

  useFrame(({ clock }, delta) => {
    const node = root.current;
    const model = body.current;
    if (!node || !model) return;
    const state = game.seats[seat];
    node.visible = !state.out;
    if (state.out) return;
    const t = clock.elapsedTime;
    const acting = game.toAct === seat;
    const won = view.winners.includes(seat) && game.handOver;

    // Everyone watches whoever is deciding; otherwise they study the board.
    let look = facing;
    if (game.toAct >= 0 && game.toAct !== seat) {
      const [tx, tz] = around(seatAngle(game.toAct), game.toAct === 0 ? 2.6 : SEAT_RADIUS);
      look = Math.atan2(tx - x, tz - z);
    }
    let diff = look - turn.current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    turn.current += diff * Math.min(1, delta * 4);
    node.rotation.y = turn.current;

    const bob = Math.sin(t * 1.6 + phase) * 0.012;
    model.position.y = bob + (won ? Math.abs(Math.sin(t * 9)) * 0.12 : 0);
    // Lean in to act; slump back after folding.
    const lean = state.folded ? -0.22 : acting ? 0.16 + Math.sin(t * 5) * 0.02 : 0.03;
    model.rotation.x += (lean - model.rotation.x) * Math.min(1, delta * 5);
    model.rotation.z = acting ? Math.sin(t * 2.4) * 0.04 : 0;
    if (eyes.current) {
      const blink = (t * 0.4 + phase) % 1 < 0.03 ? 0.1 : 1;
      eyes.current.scale.y = blink;
    }
    const glow = state.folded ? 0.15 : (view.glow[seat] ?? 0.4);
    const flicker = 0.85 + Math.sin(t * 13 + phase) * 0.1 + Math.sin(t * 31 + phase) * 0.05;
    if (ember.current) ember.current.emissiveIntensity = (0.6 + glow * 2.6) * flicker;
    if (emberLight.current) emberLight.current.intensity = (0.25 + glow * 1.3) * flicker;
  });

  return (
    <>
      <group ref={root} position={[x, 0, z]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.05, 0.08, 0.9, 8]} />
          <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.05, 16]} />
          <meshStandardMaterial color="#5a2a22" roughness={0.7} />
        </mesh>
        <group ref={body} position={[0, 0, 0]}>
          <group position={[0, 1.24, 0]}>
            <mesh scale={[1, 1.12, 1]} castShadow>
              <sphereGeometry args={[0.3, 24, 18]} />
              <meshStandardMaterial
                color={player.color}
                emissive="#b03a10"
                emissiveIntensity={0.25}
                roughness={0.55}
              />
            </mesh>
            <group ref={eyes} position={[0, 0.09, 0.25]}>
              {[-1, 1].map((side) => (
                <group key={side} position={[side * 0.1, 0, 0]}>
                  <mesh>
                    <sphereGeometry args={[0.062, 12, 10]} />
                    <meshStandardMaterial color="#fff6dc" roughness={0.25} />
                  </mesh>
                  <mesh position={[0, 0, 0.048]}>
                    <sphereGeometry args={[0.03, 8, 8]} />
                    <meshBasicMaterial color="#1c1410" />
                  </mesh>
                </group>
              ))}
            </group>
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[side * 0.27, -0.2, 0.2]}
                rotation={[1.1, 0, side * -0.3]}
                castShadow
              >
                <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
                <meshStandardMaterial color={player.color} roughness={0.6} />
              </mesh>
            ))}
            <DisguiseParts kind={player.disguise} />
            {/* The ember on its stalk always pokes out of the top of whatever it is wearing. */}
            <mesh position={[0, player.disguise === 'professor' ? 0.82 : 0.66, 0]}>
              <cylinderGeometry args={[0.012, 0.018, 0.24, 6]} />
              <meshStandardMaterial color="#5a3a1c" />
            </mesh>
            <mesh position={[0, player.disguise === 'professor' ? 0.97 : 0.81, 0]}>
              <sphereGeometry args={[0.065, 12, 10]} />
              <meshStandardMaterial
                ref={ember}
                color="#ffd27a"
                emissive="#ff7a1a"
                emissiveIntensity={1}
              />
            </mesh>
            <pointLight
              ref={emberLight}
              position={[0, player.disguise === 'professor' ? 0.97 : 0.81, 0.1]}
              color="#ff9a3c"
              intensity={0.5}
              distance={2.2}
              decay={1.6}
            />
          </group>
        </group>
      </group>
      <Label
        position={[x * 1.02, player.disguise === 'professor' ? 2.42 : 2.28, z * 1.02]}
        scale={0.82}
        getLines={() => {
          const state = game.seats[seat];
          if (state.out) return [player.name, 'Out'];
          const speech = view.speech[seat];
          const saying = speech && speech.until > performance.now() ? speech.text : '';
          return [
            player.name,
            `${state.stack}${state.lastAction ? ` · ${state.lastAction}` : ''}`,
            saying,
          ];
        }}
      />
    </>
  );
}

/** The back room itself: boards, a low lamp, a shelf of bottles and a door that is not on the plans. */
function Room() {
  const haze = useRef<Group>(null);
  const bulb = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    haze.current?.children.forEach((sheet, i) => {
      sheet.rotation.z = t * (0.03 + i * 0.012) + i * 2;
      sheet.position.y = 1.7 + i * 0.28 + Math.sin(t * 0.3 + i) * 0.05;
    });
    if (bulb.current) bulb.current.emissiveIntensity = 3.2 + Math.sin(t * 23) * 0.08;
  });
  return (
    <>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[10, 4, 10]} />
        <meshStandardMaterial color="#241812" roughness={0.95} side={BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2c1e16" roughness={0.9} />
      </mesh>
      {/* Wall boards, so the dark has some grain to it. */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[-4.8 + i * 0.8, 2, -4.97]}>
          <boxGeometry args={[0.04, 4, 0.03]} />
          <meshStandardMaterial color="#17100c" />
        </mesh>
      ))}
      {/* The lamp. */}
      <mesh position={[0, 3.3, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <coneGeometry args={[0.55, 0.36, 24, 1, true]} />
        <meshStandardMaterial color="#1f4a34" roughness={0.5} side={2} />
      </mesh>
      <mesh position={[0, 2.52, 0]}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshStandardMaterial
          ref={bulb}
          color="#fff0c8"
          emissive="#ffcf7a"
          emissiveIntensity={3.2}
        />
      </mesh>
      <spotLight
        position={[0, 2.55, 0]}
        target-position={[0, 0, 0]}
        angle={1.05}
        penumbra={0.75}
        intensity={38}
        distance={9}
        decay={1.5}
        color="#ffd9a0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
      />
      <pointLight position={[0, 2.2, 0]} color="#ffb060" intensity={2.2} distance={6} decay={1.8} />
      <group ref={haze}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.8, 0]}>
            <ringGeometry
              args={[0.2 + i * 0.25, 1.5 + i * 0.5, 40, 1, 0, Math.PI * (1.2 + i * 0.2)]}
            />
            <meshBasicMaterial
              color="#ffd9a0"
              transparent
              opacity={0.035}
              blending={AdditiveBlending}
              depthWrite={false}
              side={2}
            />
          </mesh>
        ))}
      </group>
      {/* A shelf of bottles on the far wall. */}
      <mesh position={[-2.2, 1.9, -4.8]}>
        <boxGeometry args={[2.4, 0.06, 0.3]} />
        <meshStandardMaterial color="#3a281c" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[-3.2 + i * 0.4, 2.13, -4.8]}>
          <cylinderGeometry args={[0.05, 0.07, 0.4, 10]} />
          <meshStandardMaterial
            color={['#4a8a5a', '#8a5a2c', '#3a5a8a'][i % 3]}
            emissive={['#1a4a2a', '#4a2a0c', '#1a2a4a'][i % 3]}
            emissiveIntensity={0.5}
            roughness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      {/* A framed picture of the Kiln, hung slightly crooked. */}
      <group position={[2.4, 2.1, -4.93]} rotation={[0, 0, 0.05]}>
        <mesh>
          <boxGeometry args={[1.1, 0.8, 0.05]} />
          <meshStandardMaterial color="#6a4a2a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.92, 0.62]} />
          <meshStandardMaterial color="#27363a" roughness={1} />
        </mesh>
        <mesh position={[0, -0.05, 0.035]}>
          <circleGeometry args={[0.17, 20, 0, Math.PI]} />
          <meshStandardMaterial color="#b8643a" emissive="#ff7a1a" emissiveIntensity={0.4} />
        </mesh>
      </group>
      {/* The door, with the Undercroft's lantern light under it. */}
      <mesh position={[4.96, 1.05, 1.2]}>
        <boxGeometry args={[0.06, 2.1, 1]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.85} />
      </mesh>
      <mesh position={[4.9, 0.02, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.9]} />
        <meshBasicMaterial color="#ffcf7a" transparent opacity={0.25} />
      </mesh>
    </>
  );
}

/** The table: green baize, a padded rail, and a single leg wide enough to hide a great deal. */
function Table({ game }: { game: PokerGame }) {
  const marker = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!marker.current) return;
    marker.current.visible = game.toAct >= 0;
    if (game.toAct < 0) return;
    const [x, z] = around(seatAngle(game.toAct), TABLE_RADIUS * 0.8);
    marker.current.position.set(x, TABLE_TOP + 0.004, z);
    marker.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.08);
  });
  return (
    <>
      <mesh position={[0, TABLE_TOP - 0.04, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, 0.08, 56]} />
        <meshStandardMaterial color="#1f6a44" roughness={0.95} />
      </mesh>
      <mesh position={[0, TABLE_TOP - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[TABLE_RADIUS, 0.075, 12, 56]} />
        <meshStandardMaterial color="#4a2c1a" roughness={0.5} />
      </mesh>
      <mesh position={[0, TABLE_TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TABLE_RADIUS * 0.6, TABLE_RADIUS * 0.615, 56]} />
        <meshBasicMaterial color="#ffe6b0" transparent opacity={0.18} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.5, 0.76, 16]} />
        <meshStandardMaterial color="#3a2216" roughness={0.7} />
      </mesh>
      <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.2, 0.24, 28]} />
        <meshBasicMaterial color="#ffcf7a" transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </>
  );
}

/**
 * The Warden's own two cards, held up in front of the camera the way a player holds a
 * hand, with a gloved thumb on each. They follow the head as it looks about.
 */
function HeldCards({ game }: { game: PokerGame }) {
  const hand = useRef<Group>(null);
  const { camera } = useThree();
  const seat = game.seats[0];
  const show = !seat.out && !seat.folded && seat.cards.length === 2;
  useFrame(({ clock }) => {
    const node = hand.current;
    if (!node) return;
    node.position.copy(camera.position);
    node.quaternion.copy(camera.quaternion);
    node.translateZ(-0.62);
    node.translateX(0.36);
    node.translateY(-0.17 + Math.sin(clock.elapsedTime * 1.3) * 0.004);
  });
  return (
    <group ref={hand}>
      {show &&
        seat.cards.map((card, i) => (
          <group
            key={`${game.handNumber}:${card}`}
            position={[(i - 0.5) * 0.115, 0, i * 0.004]}
            rotation={[-0.42, -0.25, (0.5 - i) * 0.2]}
          >
            <mesh>
              <boxGeometry args={[0.13, 0.182, 0.002]} />
              <meshBasicMaterial attach="material-0" color="#e8e0d0" />
              <meshBasicMaterial attach="material-1" color="#e8e0d0" />
              <meshBasicMaterial attach="material-2" color="#e8e0d0" />
              <meshBasicMaterial attach="material-3" color="#e8e0d0" />
              <meshBasicMaterial attach="material-4" map={faceTexture(card)} color="#e9e2d2" />
              <meshBasicMaterial attach="material-5" map={backTexture()} />
            </mesh>
          </group>
        ))}
      {show &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.09, -0.1, 0.02]} scale={[1, 0.8, 0.7]}>
            <sphereGeometry args={[0.04, 12, 10]} />
            <meshBasicMaterial color="#6a4a36" />
          </mesh>
        ))}
    </group>
  );
}

/** First-person head: fixed in its chair, turning a little towards wherever the pointer is. */
function Head() {
  const { camera, scene } = useThree();
  const target = useMemo(() => new Vector3(), []);
  useEffect(() => {
    scene.fog = new Fog('#0c0806', 4.5, 11);
    scene.background = new Color('#0c0806');
    camera.position.copy(EYE);
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [camera, scene]);
  useFrame(({ pointer, clock }, delta) => {
    const sway = Math.sin(clock.elapsedTime * 0.5) * 0.02;
    target.set(LOOK.x + pointer.x * 1.9 + sway, LOOK.y + pointer.y * 0.75, LOOK.z);
    camera.position.lerp(EYE, Math.min(1, delta * 4));
    // Ease the gaze by aiming at a point part-way between where it is and where it should be.
    const current = new Vector3(0, 0, -1)
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(3)
      .add(camera.position);
    current.lerp(target, Math.min(1, delta * 5));
    camera.lookAt(current);
  });
  return null;
}

interface PokerSceneProps {
  game: PokerGame;
  view: TableView;
  /** Bumped by the room after every change to the game, so cards and chips re-render. */
  version: number;
}

/** Everything in the back room, seen from the Warden's chair. */
export function PokerScene({ game, view }: PokerSceneProps) {
  const hand = game.handNumber;
  const { seats, dealer } = game;
  const [buttonX, buttonZ] =
    dealer >= 0 ? around(seatAngle(dealer) + 0.28, TABLE_RADIUS * 0.72) : [0, 0];
  return (
    <>
      <Head />
      <ambientLight intensity={0.16} color="#8a6a5a" />
      <Room />
      <Table game={game} />
      {PLAYERS.map((player, i) => (
        <Regular key={player.name} player={player} seat={i + 1} game={game} view={view} />
      ))}

      {/* Hole cards of the regulars: face down in front of them, stood up when shown. */}
      {seats.map((seat, index) => {
        if (index === 0 || seat.out || seat.cards.length < 2) return null;
        const angle = seatAngle(index);
        const order = (index - dealer - 1 + seats.length) % seats.length;
        return seat.cards.map((card, k) => {
          const [x, z] = around(angle + (k - 0.5) * 0.14, TABLE_RADIUS * 0.74);
          const shown = seat.revealed;
          return (
            <CardMesh
              key={`${hand}:${index}:${k}`}
              card={card}
              faceUp={shown}
              position={
                shown
                  ? [x * 0.9 + (k - 0.5) * 0.12, CARD_Y + 0.32, z * 0.9]
                  : [x, CARD_Y + k * 0.003, z]
              }
              yaw={shown ? 0 : angle + Math.PI + (seat.folded ? 0.6 : 0)}
              lean={shown ? 1.25 : 0}
              delay={k * 0.45 + order * 0.07}
              scale={shown ? 1.1 : seat.folded ? 0.82 : 1}
            />
          );
        });
      })}

      {/* The board, leaning back a little so it reads from the Warden's chair. */}
      {game.community.map((card, k) => (
        <CardMesh
          key={`${hand}:board:${k}`}
          card={card}
          faceUp
          position={[(k - 2) * 0.3, CARD_Y + 0.045, -0.12]}
          yaw={0}
          lean={0.3}
          delay={k < 3 ? k * 0.14 : 0}
          scale={1.08}
        />
      ))}

      {/* Stacks, bets, the pot and the button. */}
      {seats.map((seat, index) => {
        if (seat.out) return null;
        const angle = seatAngle(index);
        const [sx, sz] = around(angle - 0.34, TABLE_RADIUS * 0.8);
        const [bx, bz] = around(angle, TABLE_RADIUS * 0.5);
        return (
          <group key={`chips:${index}`}>
            <Chips amount={seat.stack} position={[sx, TABLE_TOP, sz]} />
            <Chips amount={seat.bet} position={[bx, TABLE_TOP, bz]} />
          </group>
        );
      })}
      <Chips
        amount={game.handOver ? 0 : game.pot - seats.reduce((sum, seat) => sum + seat.bet, 0)}
        position={[0, TABLE_TOP, 0.34]}
      />
      {dealer >= 0 && (
        <mesh position={[buttonX, TABLE_TOP + 0.012, buttonZ]}>
          <cylinderGeometry args={[0.06, 0.06, 0.022, 18]} />
          <meshStandardMaterial color="#fbf6ea" roughness={0.4} />
        </mesh>
      )}
      <Label
        position={[0, TABLE_TOP + 0.3, 0.3]}
        scale={0.8}
        getLines={() => (game.handOver || game.pot === 0 ? [] : [`Pot ${game.pot}`])}
      />
      <HeldCards game={game} />
    </>
  );
}
